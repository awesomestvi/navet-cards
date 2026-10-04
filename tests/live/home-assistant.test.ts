import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { mapEntity, roomEntityIds, executeCommand, type Hass } from '../../src/providers/home-assistant';
import type { CardKind } from '../../src/core';
import { PermissionDeniedError } from '../../src/core';

// Opt-in only: sessions are created by scripts/ha-validation.mjs for disposable demo hosts.
const sessionPath = resolve(process.env.NAVET_HA_SESSION ?? 'missing-session');
assert.ok(sessionPath.startsWith(resolve('.ha-validation') + sep), 'Use a disposable .ha-validation session');
const session = JSON.parse(await readFile(sessionPath, 'utf8'));
assert.equal(new URL(session.base).hostname, '127.0.0.1');
const refreshed = await fetch(session.base + '/auth/token', {
  method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: session.refresh_token, client_id: session.base + '/' }),
});
assert.equal(refreshed.status, 200, 'Disposable session refresh succeeds');
session.access_token = (await refreshed.json()).access_token;
const socket = new WebSocket(`${session.base.replace('http:', 'ws:')}/api/websocket`);
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
let id = 0;
await new Promise<void>((done, reject) => {
  const timer = setTimeout(() => reject(new Error('HA authentication timed out')), 30000);
  socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('HA socket failed')); });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.type === 'auth_required') socket.send(JSON.stringify({ type: 'auth', access_token: session.access_token }));
    if (message.type === 'auth_ok') { clearTimeout(timer); done(); }
    if (message.type === 'auth_invalid') { clearTimeout(timer); reject(new Error('HA authentication failed')); }
    if (message.type === 'result') {
      const request = pending.get(message.id);
      pending.delete(message.id);
      message.success ? request?.resolve(message.result) : request?.reject(new Error(JSON.stringify(message.error)));
    }
  });
});
function call(type: string, data: Record<string, unknown> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${type} timed out`)); }, 30000);
    pending.set(requestId, { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id: requestId, type, ...data }));
  });
}
async function host(): Promise<Hass> {
  const [states, config, entities, devices, areas] = await Promise.all([
    call('get_states'), call('get_config'), call('config/entity_registry/list'),
    call('config/device_registry/list'), call('config/area_registry/list'),
  ]);
  return {
    states: Object.fromEntries(states.map((state: any) => [state.entity_id, state])), config,
    entities: Object.fromEntries(entities.map((entity: any) => [entity.entity_id, entity])),
    devices: Object.fromEntries(devices.map((device: any) => [device.id, device])),
    areas: Object.fromEntries(areas.map((area: any) => [area.area_id, area])),
    async callService(domain, service, data, target) {
      await call('call_service', { domain, service, service_data: data, target });
    },
  };
}
async function entity(kind: CardKind, externalId: string) {
  const hass = await host();
  return { hass, model: mapEntity(hass.states[externalId], kind, externalId, hass) };
}
async function eventually(check: () => Promise<boolean>) {
  for (let i = 0; i < 60; i++) {
    if (await check()) return;
    await new Promise((done) => setTimeout(done, 250));
  }
  assert.fail('HA backend state did not converge');
}
async function serviceAs(token: string, domain: string, service: string, data?: Record<string, unknown>, target?: Record<string, unknown>) {
  const connection = new WebSocket(`${session.base.replace('http:', 'ws:')}/api/websocket`);
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Restricted service timed out')), 30000);
      connection.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Restricted connection failed')); });
      connection.addEventListener('message', ({ data: raw }) => {
        const message = JSON.parse(String(raw));
        if (message.type === 'auth_required') connection.send(JSON.stringify({ type: 'auth', access_token: token }));
        if (message.type === 'auth_invalid') { clearTimeout(timer); reject(new Error('Restricted auth failed')); }
        if (message.type === 'auth_ok') connection.send(JSON.stringify({ id: 1, type: 'call_service', domain, service, service_data: data, target }));
        if (message.type === 'result') {
          clearTimeout(timer);
          message.success ? resolve(message.result) : reject(message.error);
        }
      });
    });
  } finally { connection.close(); }
}

test(`live Home Assistant ${session.version}: real capability and service round trips`, async () => {
  try {
    const config = await call('get_config');
    assert.equal(config.version, session.version);
    const light = await entity('light', 'light.bed_light');
    assert.ok(light.model.capabilities.includes('brightness'));
    await executeCommand(light.hass, light.model, { type: 'brightness', value: 40 });
    await eventually(async () => (await entity('light', 'light.bed_light')).model.brightness === 40);
    const sw = await entity('switch', 'input_boolean.navet_test');
    await executeCommand(sw.hass, sw.model, { type: 'toggle' });
    await eventually(async () => (await entity('switch', 'input_boolean.navet_test')).model.active !== sw.model.active);
    const climate = await entity('climate', 'climate.hvac');
    await executeCommand(climate.hass, climate.model, { type: 'temperature', value: 23 });
    await eventually(async () => (await entity('climate', 'climate.hvac')).model.temperature === 23);
    const media = await entity('media', 'media_player.living_room');
    await executeCommand(media.hass, media.model, { type: 'volume', value: 35 });
    await eventually(async () => (await entity('media', 'media_player.living_room')).model.volume === 35);
    const playback = await entity('media', 'media_player.living_room');
    await executeCommand(playback.hass, playback.model, { type: 'play_pause' });
    await eventually(async () => (await entity('media', 'media_player.living_room')).model.state !== playback.model.state);
    const cover = await entity('cover', 'cover.living_room_window');
    await executeCommand(cover.hass, cover.model, { type: 'position', value: 40 });
    await eventually(async () => (await entity('cover', 'cover.living_room_window')).model.position === 40);
    const sensor = await entity('sensor', 'sensor.outside_temperature');
    assert.ok(sensor.model.available);
    assert.equal(sensor.model.unit, '°C');
    const hass = await host();
    const area = Object.entries(hass.areas!).find(([, area]) => area.name === 'Navet test room')![0];
    assert.deepEqual(roomEntityIds(hass, area), ['input_boolean.navet_test', 'light.bed_light', 'sensor.outside_temperature']);
    const dashboard = await call('lovelace/config', { url_path: 'navet-verification' });
    assert.equal(dashboard.views.length, 4);
    assert.ok(dashboard.views[1].sections[0].cards.some((card: any) => card.type === 'custom:navet-light-card'));
    for (const [role, user] of Object.entries(session.verificationUsers) as [string, any][]) {
      const flow = await fetch(session.base + '/auth/login_flow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: session.base + '/', handler: ['homeassistant', null], redirect_uri: session.base + '/' }),
      }).then((response) => response.json());
      const login = await fetch(session.base + '/auth/login_flow/' + flow.flow_id, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: session.base + '/', username: user.username, password: user.password }),
      }).then((response) => response.json());
      assert.equal(login.type, 'create_entry');
      const tokens = await fetch(session.base + '/auth/token', {
        method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', code: login.result, client_id: session.base + '/' }),
      }).then((response) => response.json());
      try {
        const state = await fetch(session.base + '/api/states/input_boolean.navet_test', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
        assert.equal(state.status, 200, `${role} can read entity state`);
        const service = await fetch(session.base + '/api/services/input_boolean/turn_on', {
          method: 'POST', headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_id: 'input_boolean.navet_test' }),
        });
        if (role === 'readonly') assert.ok([401, 403].includes(service.status), 'Read-only service is denied by HA');
        else assert.equal(service.status, 200, 'Household member can control entities');
        const restrictedHost: Hass = { states: hass.states, callService: (domain, service, data, target) => serviceAs(tokens.access_token, domain, service, data, target) };
        const model = mapEntity(hass.states['input_boolean.navet_test'], 'switch', 'input_boolean.navet_test');
        if (role === 'readonly') await assert.rejects(executeCommand(restrictedHost, model, { type: 'toggle' }), PermissionDeniedError);
        else await executeCommand(restrictedHost, model, { type: 'toggle' });
      } finally {
        await fetch(session.base + '/auth/token', { method: 'POST', body: new URLSearchParams({ action: 'revoke', token: tokens.refresh_token }) });
      }
    }
  } finally { socket.close(); }
});
