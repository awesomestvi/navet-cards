import type { CardEntity, CardKind, CardCommand, Capability } from '../core';
import { resourceUrl } from '../config';
import { PermissionDeniedError } from '../core';

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}
export interface Hass {
  callWS?<T>(message: Record<string, unknown>): Promise<T>;
  callApi?<T>(method: string, path: string): Promise<T>;
  states: Record<string, HassEntity>;
  language?: string;
  locale?: { language?: string };
  themes?: { darkMode?: boolean };
  config?: { unit_system?: { temperature?: string } };
  entities?: Record<
    string,
    {
      area_id?: string | null;
      device_id?: string | null;
      entity_category?: string | null;
      hidden_by?: string | null;
      disabled_by?: string | null;
    }
  >;
  devices?: Record<string, { area_id?: string | null }>;
  areas?: Record<string, { name: string }>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
  ): Promise<unknown>;
  formatEntityState?(entity: HassEntity): string;
  formatEntityAttributeValue?(entity: HassEntity, attribute: string, value?: unknown): string;
}
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const text = (v: unknown): string =>
  v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
const clamp = (v: number, max = 100) => Math.min(max, Math.max(0, v));

/** Scoped subset of Navet normalization; raw HA data stops at this module. */
export function mapEntity(
  entity: HassEntity | undefined,
  kind: CardKind,
  id: string,
  hass?: Hass,
  attribute?: string,
  unit?: string,
): CardEntity {
  if (['entity', 'info', 'battery', 'ups', 'energy-now', 'media-stack'].includes(kind)) kind = kindForEntity(id);
  const a = entity?.attributes ?? {};
  const state = entity?.state ?? 'missing';
  const features = finite(a.supported_features) ? a.supported_features : 0;
  const capabilities: Capability[] = [];
  if (['light', 'switch'].includes(kind)) capabilities.push('toggle');
  if (kind === 'fan') {
    if (features & 1) capabilities.push('speed');
    if ((features & 48) === 48) capabilities.push('toggle');
  }
  if (kind === 'lock' && !a.code_format) capabilities.push('lock', 'unlock');
  if (kind === 'vacuum') {
    if (features & 8192) capabilities.push('start');
    if (features & 8) capabilities.push('stop');
    if (features & 16) capabilities.push('return_home');
    if (features & 4) capabilities.push('pause');
  }
  if (['scene', 'script', 'button'].includes(kind)) capabilities.push('activate');
  if (kind === 'note' && ['input_text', 'text'].includes(id.split('.')[0]) && a.mode !== 'password') capabilities.push('text');
  const modes = Array.isArray(a.supported_color_modes) ? a.supported_color_modes : [];
  if (
    kind === 'light' &&
    (finite(a.brightness) ||
      modes.some((m) =>
        ['brightness', 'color_temp', 'hs', 'rgb', 'rgbw', 'rgbww', 'xy', 'white'].includes(
          String(m),
        ),
      ) ||
      (features & 1) !== 0)
  )
    capabilities.push('brightness');
  if (kind === 'media') {
    if (features & 16384) capabilities.push('play');
    if (features & 1) capabilities.push('pause');
    if (features & 4) capabilities.push('volume');
  }
  if (kind === 'climate' && features & 1 && finite(a.temperature)) capabilities.push('temperature');
  if (kind === 'cover') {
    if (features & 1) capabilities.push('open');
    if (features & 2) capabilities.push('close');
    if (features & 8) capabilities.push('stop');
    if (features & 4 && finite(a.current_position)) capabilities.push('position');
  }
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  const options = strings(a.options);
  const hvacModes = strings(a.hvac_modes);
  const sources = strings(a.source_list);
  if (kind === 'number' && finite(a.min) && finite(a.max) && a.max > a.min && Number.isFinite(Number(state))) capabilities.push('number');
  if (kind === 'select' && options.length) capabilities.push('select');
  if (kind === 'climate' && hvacModes.length) capabilities.push('hvac_mode');
  if (kind === 'light' && modes.includes('color_temp') && finite(a.min_color_temp_kelvin) && finite(a.max_color_temp_kelvin)) capabilities.push('color_temperature');
  if (kind === 'media') {
    if (features & 32) capabilities.push('next');
    if (features & 16) capabilities.push('previous');
    if (features & 8) capabilities.push('mute');
    if (features & 2048 && sources.length) capabilities.push('source');
  }
  const raw = attribute ? a[attribute] : state;
  const rendered =
    attribute && entity && hass?.formatEntityAttributeValue
      ? hass.formatEntityAttributeValue(entity, attribute, raw)
      : text(raw);
  return {
    id: `home_assistant:${id}`,
    externalId: id,
    name: text(a.friendly_name) || id,
    speed: finite(a.percentage) ? clamp(a.percentage) : 0,
    battery: finite(a.battery_level) ? clamp(a.battery_level) : undefined,
    humidity: finite(a.humidity) ? a.humidity : undefined,
    deviceClass: text(a.device_class),
    areaName: hass?.areas?.[hass.entities?.[id]?.area_id ?? hass.devices?.[hass.entities?.[id]?.device_id ?? '']?.area_id ?? '']?.name,
    feelsLike: finite(a.apparent_temperature) ? a.apparent_temperature : undefined,
    cleanedArea: finite(a.cleaned_area) ? a.cleaned_area : undefined,
    cleaningMinutes: finite(a.cleaning_time) ? a.cleaning_time : undefined,
    textMax: finite(a.max) ? a.max : 255, textMin: finite(a.min) ? a.min : 0, secret: a.mode === 'password',
    state,
    value: a.mode === 'password' ? '••••' : rendered,
    unit: unit ?? (attribute ? '' : kind === 'weather' ? text(a.temperature_unit) : text(a.unit_of_measurement)),
    available: !!entity && state !== 'unavailable' && (state !== 'unknown' || ['scene', 'button'].includes(kind)),
    active: [
      'on',
      'playing',
      'open',
      'opening',
      'closing',
      'heat',
      'cool',
      'auto',
      'heat_cool',
      'dry',
      'fan_only', 'home', 'cleaning', 'locked',
    ].includes(state),
    capabilities,
    number: Number.isFinite(Number(state)) ? Number(state) : undefined,
    minNumber: finite(a.min) ? a.min : undefined,
    maxNumber: finite(a.max) ? a.max : undefined,
    stepNumber: finite(a.step) && a.step > 0 ? a.step : 1,
    options, hvacModes, sources, source: text(a.source), muted: a.is_volume_muted === true,
    color_temperature: finite(a.color_temp_kelvin) ? a.color_temp_kelvin : undefined,
    minKelvin: finite(a.min_color_temp_kelvin) ? a.min_color_temp_kelvin : undefined,
    maxKelvin: finite(a.max_color_temp_kelvin) ? a.max_color_temp_kelvin : undefined,
    brightness: finite(a.brightness) ? Math.round((clamp(a.brightness, 255) / 255) * 100) : 0,
    volume: finite(a.volume_level) ? Math.round(clamp(a.volume_level, 1) * 100) : 0,
    temperature: finite(a.temperature) ? a.temperature : undefined,
    minTemperature: finite(a.min_temp) ? a.min_temp : 7,
    maxTemperature: finite(a.max_temp) ? a.max_temp : 35,
    stepTemperature:
      finite(a.target_temp_step) && a.target_temp_step > 0 ? a.target_temp_step : 0.5,
    position: finite(a.current_position) ? clamp(a.current_position) : undefined,
    currentTemperature: finite(a.current_temperature) ? a.current_temperature : undefined,
    climateAction: text(a.hvac_action),
    artist: text(a.media_artist),
    artwork:
      resourceUrl(a.entity_picture)
        ? a.entity_picture
        : undefined,
    duration: finite(a.media_duration) && a.media_duration > 0 ? a.media_duration : undefined,
    elapsed: finite(a.media_position) ? Math.max(0, a.media_position) : undefined,
    subtitle:
      kind === 'media'
        ? text(a.media_title)
        : kind === 'climate' && finite(a.current_temperature)
          ? `${a.current_temperature}${hass?.config?.unit_system?.temperature ?? '°C'}`
          : undefined,
  };
}
// Registry objects are replaced by HA on registry changes. State updates reuse them.
// Weak keys let disconnected hosts and old registries be collected.
const roomIndexes = new WeakMap<NonNullable<Hass['entities']>, WeakMap<object, Map<string, string[]>>>();
const noDevices = {};
export function roomEntityIds(hass: Hass, area: string | undefined, explicit?: string[]): string[] {
  if (explicit) return [...new Set(explicit)];
  if (!area || !hass.entities) return [];
  let byDevices = roomIndexes.get(hass.entities);
  if (!byDevices) roomIndexes.set(hass.entities, byDevices = new WeakMap());
  const devices = hass.devices ?? noDevices;
  let index = byDevices.get(devices);
  if (!index) {
    index = new Map();
    for (const [id, e] of Object.entries(hass.entities)) {
      if (!['light', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'climate', 'media_player', 'cover', 'number', 'input_number', 'select', 'input_select', 'fan', 'lock', 'vacuum', 'person', 'weather', 'scene', 'script'].includes(id.split('.')[0]) || e.hidden_by || e.disabled_by || e.entity_category) continue;
      const owner = e.area_id ?? (e.device_id ? hass.devices?.[e.device_id]?.area_id : null);
      if (!owner) continue;
      const members = index.get(owner) ?? [];
      members.push(id);
      index.set(owner, members);
    }
    for (const members of index.values()) members.sort();
    byDevices.set(devices, index);
  }
  // Do not expose mutable cached arrays to consumers.
  return [...(index.get(area) ?? [])];
}
export function kindForEntity(id: string): CardKind {
  return (
    (
      {
        fan: 'fan', lock: 'lock', vacuum: 'vacuum', person: 'person', device_tracker: 'person', weather: 'weather',
        scene: 'scene', script: 'script', button: 'button', input_button: 'button', input_text: 'note', text: 'note', image: 'photo',
        light: 'light',
        switch: 'switch',
        input_boolean: 'switch',
        media_player: 'media',
        climate: 'climate',
        cover: 'cover',
        number: 'number', input_number: 'number', select: 'select', input_select: 'select',
      } as Record<string, CardKind>
    )[id.split('.')[0]] ?? 'sensor'
  );
}

/** Normalize service failures at the host boundary, including HA's plain WS errors. */
export async function callHostService(
  hass: Hass,
  domain: string,
  service: string,
  data: Record<string, unknown>,
  target: Record<string, unknown>,
): Promise<unknown> {
  try {
    return await hass.callService(domain, service, data, target);
  } catch (error) {
    const details = error && typeof error === 'object' && 'error' in error ? error.error : error;
    if (
      details &&
      typeof details === 'object' &&
      'code' in details &&
      (details.code === 'unauthorized' ||
        (details.code === 'home_assistant_error' &&
          'message' in details &&
          details.message === 'Unauthorized'))
    )
      throw new PermissionDeniedError('You do not have permission to run this action.');
    throw error;
  }
}

export async function executeCommand(
  hass: Hass,
  entity: CardEntity,
  command: CardCommand,
): Promise<void> {
  if (!entity.available) throw new Error('This entity is unavailable.');
  const domain = entity.externalId.split('.')[0];
  const target = { entity_id: entity.externalId };
  let service: string;
  let data: Record<string, unknown> = {};
  switch (command.type) {
    case 'speed':
      if (!entity.capabilities.includes('speed') || !Number.isFinite(command.value) || command.value < 0 || command.value > 100) throw new Error('Speed is not supported or outside the supported range.');
      service = 'set_percentage'; data = { percentage: command.value }; break;
    case 'lock':
    case 'unlock':
    case 'start':
    case 'return_home':
    case 'activate':
      if (!entity.capabilities.includes(command.type)) throw new Error('This control is not supported.');
      service = command.type === 'activate' ? (['button', 'input_button'].includes(domain) ? 'press' : 'turn_on') : command.type === 'return_home' ? 'return_to_base' : command.type; break;
    case 'text':
      if (!entity.capabilities.includes('text') || command.value.length < (entity.textMin ?? 0) || command.value.length > (entity.textMax ?? 255)) throw new Error('Note length is outside the supported range.');
      service = 'set_value'; data = { value: command.value }; break;
    case 'pause':
      if (domain !== 'vacuum' || !entity.capabilities.includes('pause')) throw new Error('Pause is not supported.');
      service = 'pause'; break;
    case 'number':
    case 'color_temperature': {
      if (!entity.capabilities.includes(command.type)) throw new Error('This control is not supported.');
      const min = command.type === 'number' ? entity.minNumber! : entity.minKelvin!;
      const max = command.type === 'number' ? entity.maxNumber! : entity.maxKelvin!;
      if (!Number.isFinite(command.value) || command.value < min || command.value > max) throw new Error('Value is outside the supported range.');
      service = command.type === 'number' ? 'set_value' : 'turn_on';
      data = command.type === 'number' ? { value: command.value } : { color_temp_kelvin: command.value };
      break;
    }
    case 'select':
    case 'hvac_mode':
    case 'source': {
      const options = command.type === 'select' ? entity.options : command.type === 'hvac_mode' ? entity.hvacModes : entity.sources;
      if (!entity.capabilities.includes(command.type) || !options?.includes(command.value)) throw new Error('Option is not supported.');
      service = command.type === 'select' ? 'select_option' : command.type === 'hvac_mode' ? 'set_hvac_mode' : 'select_source';
      data = { [command.type === 'select' ? 'option' : command.type === 'hvac_mode' ? 'hvac_mode' : 'source']: command.value };
      break;
    }
    case 'next':
    case 'previous':
    case 'mute':
      if (!entity.capabilities.includes(command.type)) throw new Error('This control is not supported.');
      service = command.type === 'next' ? 'media_next_track' : command.type === 'previous' ? 'media_previous_track' : 'volume_mute';
      if (command.type === 'mute') data = { is_volume_muted: !entity.muted };
      break;
    case 'toggle':
      if (!entity.capabilities.includes('toggle')) throw new Error('Toggle is not supported.');
      service = entity.active ? 'turn_off' : 'turn_on';
      break;
    case 'brightness':
      if (!entity.capabilities.includes('brightness'))
        throw new Error('Brightness is not supported.');
      if (!Number.isFinite(command.value)) throw new Error('Brightness must be a number.');
      service = command.value <= 0 ? 'turn_off' : 'turn_on';
      if (command.value > 0) data = { brightness_pct: clamp(command.value) };
      break;
    case 'play_pause': {
      const capability = entity.state === 'playing' ? 'pause' : 'play';
      if (!entity.capabilities.includes(capability)) throw new Error('Playback is not supported.');
      service = entity.state === 'playing' ? 'media_pause' : 'media_play';
      break;
    }
    case 'volume':
      if (!entity.capabilities.includes('volume')) throw new Error('Volume is not supported.');
      if (!Number.isFinite(command.value)) throw new Error('Volume must be a number.');
      service = 'volume_set';
      data = { volume_level: clamp(command.value) / 100 };
      break;
    case 'temperature':
      if (!entity.capabilities.includes('temperature'))
        throw new Error('Temperature is not supported.');
      if (
        !Number.isFinite(command.value) ||
        command.value < entity.minTemperature! ||
        command.value > entity.maxTemperature!
      )
        throw new Error('Temperature is outside the supported range.');
      service = 'set_temperature';
      data = { temperature: command.value };
      break;
    case 'position':
      if (!entity.capabilities.includes('position')) throw new Error('Position is not supported.');
      if (!Number.isFinite(command.value)) throw new Error('Position must be a number.');
      service = 'set_cover_position';
      data = { position: clamp(command.value) };
      break;
    default:
      if (!entity.capabilities.includes(command.type))
        throw new Error('This control is not supported.');
      service = domain === 'vacuum' && command.type === 'stop' ? 'stop' : `${command.type}_cover`;
  }
  await callHostService(hass, domain, service, data, target);
}

/** Ask the host to load its own editor components; the standalone preview keeps its fallback. */
export async function prepareHostEditor(): Promise<void> {
  if (customElements.get('ha-form')) return;
  const host = window as Window & { loadCardHelpers?: () => Promise<{ createCardElement(config: Record<string, unknown>): HTMLElement }> };
  if (!host.loadCardHelpers) return;
  try {
    const helpers = await host.loadCardHelpers();
    const tile = helpers.createCardElement({ type: 'tile', entity: 'sensor.navet_editor' });
    const constructor = tile.constructor as typeof HTMLElement & { getConfigElement?: () => HTMLElement | Promise<HTMLElement> };
    await constructor.getConfigElement?.();
  } catch {
    // Custom cards must remain editable when host UI components cannot be loaded.
  }
}
