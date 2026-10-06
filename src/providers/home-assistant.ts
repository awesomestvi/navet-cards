import type { CardEntity, CardKind, CardCommand, Capability } from '../core';
import { PermissionDeniedError } from '../core';

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}
export interface Hass {
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
  const a = entity?.attributes ?? {};
  const state = entity?.state ?? 'missing';
  const features = finite(a.supported_features) ? a.supported_features : 0;
  const capabilities: Capability[] = [];
  if (['light', 'switch'].includes(kind)) capabilities.push('toggle');
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
    state,
    value: rendered,
    unit: unit ?? (attribute ? '' : text(a.unit_of_measurement)),
    available: !!entity && !['unavailable', 'unknown'].includes(state),
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
      'fan_only',
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
      typeof a.entity_picture === 'string' && /^(\/[^/]|https?:\/\/)/i.test(a.entity_picture)
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
      if (!['light', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'climate', 'media_player', 'cover', 'number', 'input_number', 'select', 'input_select'].includes(id.split('.')[0]) || e.hidden_by || e.disabled_by || e.entity_category) continue;
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
      service = `${command.type}_cover`;
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
