import type { CardEntity, CardKind, CardCommand, Capability } from '../core';

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
    brightness: finite(a.brightness) ? Math.round((clamp(a.brightness, 255) / 255) * 100) : 0,
    volume: finite(a.volume_level) ? Math.round(clamp(a.volume_level, 1) * 100) : 0,
    temperature: finite(a.temperature) ? a.temperature : undefined,
    minTemperature: finite(a.min_temp) ? a.min_temp : 7,
    maxTemperature: finite(a.max_temp) ? a.max_temp : 35,
    stepTemperature:
      finite(a.target_temp_step) && a.target_temp_step > 0 ? a.target_temp_step : 0.5,
    position: finite(a.current_position) ? clamp(a.current_position) : undefined,
    subtitle:
      kind === 'media'
        ? text(a.media_title)
        : kind === 'climate' && finite(a.current_temperature)
          ? `${a.current_temperature}${hass?.config?.unit_system?.temperature ?? '°C'}`
          : undefined,
  };
}
export function roomEntityIds(hass: Hass, area: string | undefined, explicit?: string[]): string[] {
  if (explicit) return [...new Set(explicit)];
  if (!area) return [];
  return Object.entries(hass.entities ?? {})
    .filter(([id, e]) => {
      const domain = id.split('.')[0];
      return (
        [
          'light',
          'switch',
          'input_boolean',
          'sensor',
          'binary_sensor',
          'climate',
          'media_player',
          'cover',
        ].includes(domain) &&
        !e.hidden_by &&
        !e.disabled_by &&
        !e.entity_category &&
        (e.area_id ?? (e.device_id ? hass.devices?.[e.device_id]?.area_id : null)) === area
      );
    })
    .map(([id]) => id)
    .sort();
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
      } as Record<string, CardKind>
    )[id.split('.')[0]] ?? 'sensor'
  );
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
  await hass.callService(domain, service, data, target);
}
