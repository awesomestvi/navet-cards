import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from '../src/config';
import {
  mapEntity,
  roomEntityIds,
  executeCommand,
  callHostService,
  type Hass,
} from '../src/providers/home-assistant';
import { PermissionDeniedError } from '../src/core';

const switchConfig = { type: 'custom:navet-switch-card', entity: 'switch.coffee' };
const hass = (states: Hass['states'] = {}): Hass => ({ states, async callService() {} });
test('host service permission failures normalize for controls and configured actions', async () => {
  const host: Hass = {
    states: {},
    async callService() {
      throw { code: 'unauthorized', message: 'Unauthorized' };
    },
  };
  await assert.rejects(callHostService(host, 'scene', 'turn_on', {}, {}), PermissionDeniedError);
  const model = mapEntity(
    { entity_id: 'switch.test', state: 'off', attributes: {} },
    'switch',
    'switch.test',
  );
  await assert.rejects(executeCommand(host, model, { type: 'toggle' }), PermissionDeniedError);
  host.callService = async () => {
    throw { error: { code: 'unauthorized', message: 'Unauthorized' }, message: 'Unauthorized' };
  };
  await assert.rejects(executeCommand(host, model, { type: 'toggle' }), PermissionDeniedError);
  host.callService = async () => {
    throw { code: 'home_assistant_error', message: 'Unauthorized' };
  };
  await assert.rejects(executeCommand(host, model, { type: 'toggle' }), PermissionDeniedError);
  const networkError = new Error('Connection lost');
  host.callService = async () => {
    throw networkError;
  };
  await assert.rejects(
    callHostService(host, 'switch', 'turn_on', {}, {}),
    (error) => error === networkError,
  );
});
test('configuration is isolated and advanced fields survive round-tripping', () => {
  const input = {
    ...switchConfig,
    appearance: { accent: '#ea8c55' },
    grid_options: { columns: 6, rows: 3 },
    custom_field: { value: 1 },
    tap_action: {
      action: 'perform-action',
      perform_action: 'scene.turn_on',
      data: { transition: 2 },
      target: { entity_id: 'scene.evening' },
    },
  };
  const a = validateConfig(input, 'switch');
  const b = validateConfig(input, 'switch');
  a.appearance!.accent = '#123456';
  assert.equal(input.appearance.accent, '#ea8c55');
  assert.equal(b.appearance!.accent, '#ea8c55');
  assert.deepEqual(b.custom_field, { value: 1 });
});
test('rejects incompatible entities, malformed options, and external navigation', () => {
  for (const change of [
    { entity: 'light.kitchen' },
    { entity: '<script>' },
    { layout: 'huge' },
    { show_state: 'yes' },
    { appearance: { radius: NaN } },
    { appearance: { accent: 'red;display:none' } },
    { grid_options: { rows: 0 } },
    { tap_action: { action: 'navigate', navigation_path: '//evil.example' } },
    { hold_action: { action: 'perform-action', perform_action: 'invalid' } },
  ])
    assert.throws(() => validateConfig({ ...switchConfig, ...change }, 'switch'));
  assert.throws(() =>
    validateConfig(
      { type: 'custom:navet-sensor-card', entity: 'sensor.test', tap_action: { action: 'toggle' } },
      'sensor',
    ),
  );
});
test('room accepts explicit entities or area and rejects an empty definition', () => {
  assert.equal(
    validateConfig({ type: 'custom:navet-room-card', area: 'kitchen' }, 'room').area,
    'kitchen',
  );
  assert.throws(() => validateConfig({ type: 'custom:navet-room-card', entities: [] }, 'room'));
});
test('off dimmable lights retain brightness capability and binary lights do not', () => {
  const e = {
    entity_id: 'light.test',
    state: 'off',
    attributes: { supported_color_modes: ['brightness'] },
  };
  assert.ok(mapEntity(e, 'light', e.entity_id).capabilities.includes('brightness'));
  assert.ok(
    !mapEntity(
      { ...e, attributes: { supported_color_modes: ['onoff'] } },
      'light',
      e.entity_id,
    ).capabilities.includes('brightness'),
  );
  assert.equal(
    mapEntity({ ...e, attributes: { brightness: 255 } }, 'light', e.entity_id).brightness,
    100,
  );
});
test('unavailable and missing entities remain distinct', () => {
  assert.equal(mapEntity(undefined, 'sensor', 'sensor.test').state, 'missing');
  const m = mapEntity(
    { entity_id: 'sensor.test', state: 'unavailable', attributes: {} },
    'sensor',
    'sensor.test',
  );
  assert.equal(m.available, false);
});
test('sensor attributes preserve zero and a configured unit', () => {
  const m = mapEntity(
    { entity_id: 'sensor.test', state: '22', attributes: { count: 0, unit_of_measurement: '°C' } },
    'sensor',
    'sensor.test',
    undefined,
    'count',
    'items',
  );
  assert.equal(m.value, '0');
  assert.equal(m.unit, 'items');
});
test('room resolves device area with entity override and excludes diagnostics', () => {
  const h = hass();
  h.entities = {
    'light.a': { device_id: 'a' },
    'light.b': { device_id: 'a', area_id: 'hall' },
    'sensor.c': { area_id: 'kitchen', entity_category: 'diagnostic' },
    'switch.d': { area_id: 'kitchen' },
    'light.hidden': { area_id: 'kitchen', hidden_by: 'user' },
  };
  h.devices = { a: { area_id: 'kitchen' } };
  assert.deepEqual(roomEntityIds(h, 'kitchen'), ['light.a', 'switch.d']);
  assert.deepEqual(roomEntityIds(h, 'kitchen', ['light.b', 'light.b']), ['light.b']);
});
test('commands use the injected host, explicit owning entity, and validated capability', async () => {
  const calls: unknown[][] = [];
  const h = hass();
  h.callService = async (...args) => {
    calls.push(args);
  };
  const e = mapEntity(
    { entity_id: 'light.a', state: 'on', attributes: { brightness: 128 } },
    'light',
    'light.a',
  );
  await executeCommand(h, e, { type: 'toggle' });
  await executeCommand(h, e, { type: 'brightness', value: 40 });
  await executeCommand(h, e, { type: 'brightness', value: 0 });
  assert.deepEqual(calls, [
    ['light', 'turn_off', {}, { entity_id: 'light.a' }],
    ['light', 'turn_on', { brightness_pct: 40 }, { entity_id: 'light.a' }],
    ['light', 'turn_off', {}, { entity_id: 'light.a' }],
  ]);
  await assert.rejects(
    executeCommand(h, { ...e, available: false }, { type: 'toggle' }),
    /unavailable/,
  );
  await assert.rejects(
    executeCommand(h, { ...e, capabilities: [] }, { type: 'brightness', value: 40 }),
    /not supported/,
  );
  await assert.rejects(executeCommand(h, e, { type: 'brightness', value: NaN }), /number/);
});
test('media playback capability is checked against current state', async () => {
  const h = hass();
  const e = mapEntity(
    { entity_id: 'media_player.a', state: 'playing', attributes: { supported_features: 16384 } },
    'media',
    'media_player.a',
  );
  await assert.rejects(executeCommand(h, e, { type: 'play_pause' }), /not supported/);
  await executeCommand(h, { ...e, state: 'paused' }, { type: 'play_pause' });
});
test('cover and climate commands retain native units and supported ranges', async () => {
  const calls: unknown[][] = [];
  const h = hass();
  h.callService = async (...args) => {
    calls.push(args);
  };
  const cover = mapEntity(
    {
      entity_id: 'cover.a',
      state: 'open',
      attributes: { supported_features: 15, current_position: 50 },
    },
    'cover',
    'cover.a',
  );
  await executeCommand(h, cover, { type: 'position', value: 20 });
  const climate = mapEntity(
    {
      entity_id: 'climate.a',
      state: 'heat',
      attributes: { supported_features: 1, temperature: 21, min_temp: 7, max_temp: 30 },
    },
    'climate',
    'climate.a',
  );
  await executeCommand(h, climate, { type: 'temperature', value: 22.5 });
  await assert.rejects(executeCommand(h, climate, { type: 'temperature', value: 35 }), /range/);
  assert.deepEqual(calls, [
    ['cover', 'set_cover_position', { position: 20 }, { entity_id: 'cover.a' }],
    ['climate', 'set_temperature', { temperature: 22.5 }, { entity_id: 'climate.a' }],
  ]);
});

test('presentation models normalize media metadata and reject executable artwork URLs', () => {
  const entity = {
    entity_id: 'media_player.test',
    state: 'playing',
    attributes: {
      media_artist: 'Navet Studio',
      media_title: 'Aerial',
      entity_picture: '/api/media_player_proxy/test?token=test',
      media_duration: 243,
      media_position: 86,
    },
  };
  const model = mapEntity(entity, 'media', entity.entity_id);
  assert.equal(model.artist, 'Navet Studio');
  assert.equal(model.duration, 243);
  assert.equal(model.elapsed, 86);
  assert.equal(model.artwork, entity.attributes.entity_picture);
  for (const url of ['https://example.test/cover.jpg', 'http://example.test/cover.jpg'])
    assert.equal(
      mapEntity(
        { ...entity, attributes: { ...entity.attributes, entity_picture: url } },
        'media',
        entity.entity_id,
      ).artwork,
      url,
    );
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '//external.test/image'])
    assert.equal(
      mapEntity(
        { ...entity, attributes: { ...entity.attributes, entity_picture: url } },
        'media',
        entity.entity_id,
      ).artwork,
      undefined,
    );
  const climate = mapEntity(
    {
      entity_id: 'climate.test',
      state: 'cool',
      attributes: { current_temperature: 21, hvac_action: 'cooling' },
    },
    'climate',
    'climate.test',
  );
  assert.equal(climate.currentTemperature, 21);
  assert.equal(climate.climateAction, 'cooling');
});
