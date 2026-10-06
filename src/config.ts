import type { CardKind } from './core';

export const KINDS: CardKind[] = ['light', 'switch', 'sensor', 'room', 'media', 'climate', 'cover', 'number', 'select', 'navigation'];
export const tagFor = (kind: CardKind) => `navet-${kind}-card`;
export interface ActionConfig {
  action: 'none' | 'toggle' | 'more-info' | 'navigate' | 'perform-action';
  navigation_path?: string;
  perform_action?: string;
  target?: Record<string, unknown>;
  data?: Record<string, unknown>;
  confirmation?: boolean | { text?: string };
}
export interface SubControl {
  entity: string;
  name?: string;
  control?: 'state' | 'toggle' | 'slider' | 'select';
  visible_when?: { entity: string; state: string };
  tap_action?: ActionConfig;
}
export interface NavigationLink { name: string; path: string; }
export interface CardConfig {
  type: string;
  entity?: string;
  entities?: string[];
  area?: string;
  name?: string;
  icon?: string;
  attribute?: string;
  unit?: string;
  layout?: 'compact' | 'comfortable' | 'row';
  panel_id?: string;
  sub_controls?: SubControl[];
  links?: NavigationLink[];
  show_state?: boolean;
  show_brightness?: boolean;
  appearance?: {
    accent?: string;
    radius?: number;
    effects?: 'low' | 'high';
    preset?: 'warm' | 'neutral' | 'cool';
    theme?: 'auto' | 'light' | 'dark' | 'black' | 'glass';
  };
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  grid_options?: { columns?: number | 'full'; rows?: number | 'auto'; [key: string]: unknown };
  [key: string]: unknown;
}
export const domainAllowed = (kind: CardKind, entity: string) => {
  const domain = entity.split('.')[0];
  return (
    {
      light: ['light'],
      switch: ['switch', 'input_boolean'],
      sensor: ['sensor', 'binary_sensor'],
      media: ['media_player'],
      climate: ['climate'],
      cover: ['cover'],
      room: [], navigation: [], number: ['number', 'input_number'], select: ['select', 'input_select'],
    } as Record<CardKind, string[]>
  )[kind].includes(domain);
};
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
function fail(message: string): never {
  throw new Error(`Navet Cards: ${message}`);
}
export const localPath = (v: unknown): v is string => typeof v === 'string' && (/^#[a-z0-9_-]+$/i.test(v) || (v.startsWith('/') && !v.startsWith('//') && !/[\\\r\n]/.test(v)));
const entityId = (v: unknown): v is string =>
  typeof v === 'string' && /^[a-z_]+\.[a-z0-9_]+$/.test(v);

export function validateConfig(input: unknown, kind: CardKind): CardConfig {
  if (!object(input)) fail('configuration must be an object.');
  if (input.type !== `custom:${tagFor(kind)}`) fail(`type must be custom:${tagFor(kind)}.`);
  if (kind === 'room') {
    if (input.area !== undefined && (typeof input.area !== 'string' || !input.area.trim()))
      fail('area must be an area ID.');
    if (
      input.entities !== undefined &&
      (!Array.isArray(input.entities) || !input.entities.length || !input.entities.every(entityId))
    )
      fail('entities must be a nonempty list of entity IDs.');
    if (!input.area && !input.entities) fail('a room needs area or entities.');
  } else if (kind === 'navigation') {
    if (!Array.isArray(input.links) || !input.links.length || input.links.length > 20) fail('navigation needs 1–20 links.');
    for (const link of input.links) {
      if (!object(link) || typeof link.name !== 'string' || !link.name.trim() || !localPath(link.path)) fail('links need a name and local path or panel hash.');
    }
  } else if (!entityId(input.entity) || !domainAllowed(kind, input.entity)) {
    fail(`entity must reference a supported ${kind} entity.`);
  }
  for (const key of ['name', 'icon', 'attribute', 'unit']) {
    if (input[key] !== undefined && typeof input[key] !== 'string') fail(`${key} must be text.`);
  }
  if (input.icon !== undefined && !/^[a-z0-9_-]+:[a-z0-9_-]+$/i.test(String(input.icon)))
    fail('icon must use a namespace, such as mdi:lightbulb.');
  if (input.layout !== undefined && !['compact', 'comfortable', 'row'].includes(String(input.layout)))
    fail('layout must be compact, comfortable or row.');
  for (const key of ['show_state', 'show_brightness'])
    if (input[key] !== undefined && typeof input[key] !== 'boolean')
      fail(`${key} must be true or false.`);
  if (input.appearance !== undefined) {
    if (!object(input.appearance)) fail('appearance must be an object.');
    const a = input.appearance;
    if (a.effects !== undefined && !['low', 'high'].includes(String(a.effects))) fail('effects must be low or high.');
    if (a.preset !== undefined && !['warm', 'neutral', 'cool'].includes(String(a.preset))) fail('unknown appearance preset.');
    if (
      a.accent !== undefined &&
      (typeof a.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(a.accent))
    )
      fail('accent must be a six-digit hex color.');
    if (
      a.radius !== undefined &&
      (typeof a.radius !== 'number' || !Number.isFinite(a.radius) || a.radius < 0 || a.radius > 48)
    )
      fail('radius must be between 0 and 48.');
    if (
      a.theme !== undefined &&
      !['auto', 'light', 'dark', 'black', 'glass'].includes(String(a.theme))
    )
      fail('unknown appearance theme.');
  }
  for (const key of ['tap_action', 'hold_action', 'double_tap_action']) {
    const action = input[key];
    if (action === undefined) continue;
    if (
      !object(action) ||
      !['none', 'toggle', 'more-info', 'navigate', 'perform-action'].includes(String(action.action))
    )
      fail(`${key} has an unsupported action.`);
    if (action.action === 'toggle' && !['light', 'switch'].includes(kind))
      fail('toggle is supported on light and switch cards.');
    if (
      action.action === 'navigate' &&
      (typeof action.navigation_path !== 'string' ||
        !localPath(action.navigation_path))
    )
      fail('navigation_path must be a local path or panel hash.');
    if (
      action.action === 'perform-action' &&
      (typeof action.perform_action !== 'string' ||
        !/^[a-z_]+\.[a-z0-9_]+$/.test(action.perform_action))
    )
      fail('perform_action must be domain.action.');
    if (action.target !== undefined && !object(action.target))
      fail('action target must be an object.');
    if (action.data !== undefined && !object(action.data)) fail('action data must be an object.');
    if (
      action.confirmation !== undefined &&
      typeof action.confirmation !== 'boolean' &&
      !object(action.confirmation)
    )
      fail('confirmation must be a boolean or object.');
    if (
      object(action.confirmation) &&
      action.confirmation.text !== undefined &&
      typeof action.confirmation.text !== 'string'
    )
      fail('confirmation text must be text.');
  }
  if (input.panel_id !== undefined && (kind !== 'room' || typeof input.panel_id !== 'string' || !/^#[a-z0-9_-]+$/i.test(input.panel_id))) fail('panel_id must be a unique room hash, such as #kitchen.');
  if (input.sub_controls !== undefined) {
    if (!Array.isArray(input.sub_controls) || input.sub_controls.length > 8) fail('sub_controls must contain at most eight controls.');
    for (const sub of input.sub_controls) {
      if (!object(sub) || !entityId(sub.entity)) fail('sub-controls need an entity.');
      if (sub.name !== undefined && typeof sub.name !== 'string') fail('sub-control name must be text.');
      if (sub.control !== undefined && !['state', 'toggle', 'slider', 'select'].includes(String(sub.control))) fail('unsupported sub-control.');
      if (sub.visible_when !== undefined && (!object(sub.visible_when) || !entityId(sub.visible_when.entity) || typeof sub.visible_when.state !== 'string')) fail('visible_when needs an entity and state.');
      if (sub.tap_action !== undefined) validateConfig({ type: 'custom:navet-switch-card', entity: 'switch.validation', tap_action: sub.tap_action }, 'switch');
    }
  }
  if (input.grid_options !== undefined) {
    if (!object(input.grid_options)) fail('grid_options must be an object.');
    const { columns, rows } = input.grid_options;
    if (
      columns !== undefined &&
      columns !== 'full' &&
      (typeof columns !== 'number' || !Number.isInteger(columns) || columns < 1 || columns > 12)
    )
      fail('grid columns must be 1–12 or full.');
    if (
      rows !== undefined &&
      rows !== 'auto' &&
      (typeof rows !== 'number' || !Number.isFinite(rows) || rows < 1)
    )
      fail('grid rows must be at least 1 or auto.');
  }
  // Configuration is HA-owned JSON. Clone before applying defaults or editing.
  return structuredClone(input) as unknown as CardConfig;
}
