import { test, expect } from '@playwright/test';

const errors = new WeakMap<object, string[]>();
test.afterEach(async ({ page }) => {
  expect(errors.get(page) ?? []).toEqual([]);
});
test.beforeEach(async ({ page }) => {
  const pageErrors: string[] = [];
  errors.set(page, pageErrors);
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/demo/index.html');
  await expect(
    page.locator('navet-light-card').getByRole('button', { name: 'Kitchen lights', exact: true }),
  ).toBeVisible();
});

test('native controls route correctly, primary tap toggles, and unavailable controls are disabled', async ({
  page,
}) => {
  const light = page.locator('navet-light-card');
  await light.getByRole('button', { name: 'Kitchen lights', exact: true }).click();
  await expect(light.getByRole('button', { name: 'On', exact: true })).toBeVisible();
  await light.getByRole('button', { name: 'On', exact: true }).click();
  await light.getByRole('slider').evaluate((input: HTMLInputElement) => {
    input.value = '40';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await light.getByRole('slider').dispatchEvent('change');
  await expect(light.locator('output')).toHaveText('40%');
  expect(await page.evaluate(() => (window as any).calls.map((c: any) => c.service))).toEqual([
    'turn_off',
    'turn_on',
    'turn_on',
  ]);
  await page.getByRole('button', { name: 'Unavailable state' }).click();
  await expect(light.getByRole('slider')).toBeDisabled();
  await expect(light.locator('.state')).toHaveText('Unavailable');
  await light.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(page.locator('#events')).toHaveText('More info · light.kitchen');
});

test('failed commands expose a recoverable error', async ({ page }) => {
  await page.getByRole('button', { name: 'Fail next action' }).click();
  const light = page.locator('navet-light-card');
  await light.getByRole('button', { name: 'Off', exact: true }).click();
  await expect(light.getByRole('alert')).toHaveText('The device did not respond. Try again.');
  await light.getByRole('button', { name: 'Off', exact: true }).click();
  await expect(light.getByRole('alert')).toHaveCount(0);
  await expect(light.getByRole('button', { name: 'On', exact: true })).toBeVisible();
});

test('permission denial explains access limits for controls and configured actions', async ({
  page,
}) => {
  await page.evaluate(() => {
    (window as any).demoHass = {
      ...(window as any).demoHass,
      async callService() {
        throw { code: 'home_assistant_error', message: 'Unauthorized' };
      },
    };
    (window as any).syncCards();
  });
  const light = page.locator('navet-light-card');
  await light.getByRole('button', { name: 'Off', exact: true }).click();
  await expect(light.getByRole('alert')).toHaveText(
    'You do not have permission to run this action.',
  );
  await light.getByRole('button', { name: 'Close', exact: true }).click();
  await page.evaluate(() => {
    (window as any).cards[0].setConfig({
      ...(window as any).configs[0],
      tap_action: { action: 'perform-action', perform_action: 'scene.turn_on' },
    });
  });
  await light.getByRole('button', { name: 'Kitchen lights', exact: true }).click();
  await expect(light.getByRole('alert')).toHaveText(
    'You do not have permission to run this action.',
  );
  await expect(light.getByRole('button', { name: 'Off', exact: true })).toBeEnabled();
});

test('editor preserves advanced configuration and changes only its card', async ({ page }) => {
  await page.evaluate(() => {
    const editor = document.querySelector('#editor') as any;
    editor.setConfig({
      ...(window as any).configs[0],
      appearance: { accent: '#ea8c55', radius: 24 },
      tap_action: {
        action: 'perform-action',
        perform_action: 'scene.turn_on',
        data: { transition: 2 },
        target: { entity_id: 'scene.evening' },
      },
      custom_field: { keep: true },
      grid_options: { columns: 6, rows: 4 },
    });
    editor.addEventListener('config-changed', (event: any) => {
      (window as any).edited = event.detail.config;
    });
  });
  await page.locator('#editor-panel > summary').click();
  await page
    .locator('#editor')
    .getByLabel('Name', { exact: true })
    .fill('A long kitchen light name');
  await page.locator('#editor').getByLabel('Name', { exact: true }).dispatchEvent('change');
  const edited = await page.evaluate(() => (window as any).edited);
  expect(edited.custom_field).toEqual({ keep: true });
  expect(edited.tap_action.target).toEqual({ entity_id: 'scene.evening' });
  expect(edited.tap_action.data).toEqual({ transition: 2 });
  expect(edited.grid_options).toEqual({ columns: 6, rows: 4 });
  await expect(page.locator('navet-light-card').locator('.name')).toHaveText(
    'A long kitchen light name',
  );
  await expect(page.locator('navet-switch-card').locator('.name')).toHaveText('Coffee machine');
});

test('room dialog supports Escape and exposes native entity details', async ({ page }) => {
  const room = page.locator('navet-room-card');
  await room.getByRole('button', { name: 'Controls', exact: true }).click();
  await expect(room.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(room.getByRole('dialog')).not.toBeVisible();
  await room.getByRole('button', { name: 'Controls', exact: true }).click();
  await room.getByRole('button', { name: /Coffee machine/ }).click();
  await expect(page.locator('#events')).toHaveText('More info · switch.coffee');
});

test('hold does not also fire a tap and double-tap dispatches one configured action', async ({
  page,
}) => {
  const primary = page
    .locator('navet-light-card')
    .getByRole('button', { name: 'Kitchen lights', exact: true });
  await primary.hover();
  await page.mouse.down();
  await page.waitForTimeout(550);
  await page.mouse.up();
  await expect(page.locator('#events')).toHaveText('More info · light.kitchen');
  expect(await page.evaluate(() => (window as any).calls.length)).toBe(0);
  await page.evaluate(() =>
    (window as any).cards[0].setConfig({
      ...(window as any).configs[0],
      double_tap_action: { action: 'more-info' },
    }),
  );
  await primary.dblclick();
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).calls.length)).toBe(0);
});

test('preview mode is read-only and context subscriptions clean up on reconnect', async ({
  page,
}) => {
  await page.evaluate(() => {
    let count = 0;
    document.addEventListener('context-request', (event: any) => {
      event.callback((window as any).demoHass.states, () => {
        count++;
        (window as any).unsubscribed = count;
      });
    });
    const card = (window as any).cards[0];
    card.remove();
    document.querySelector('#cards')!.append(card);
    card.preview = true;
  });
  await expect(page.locator('navet-light-card').getByRole('slider')).toBeDisabled();
  await page.evaluate(() => {
    const card = (window as any).cards[0];
    card.remove();
    document.querySelector('#cards')!.append(card);
    card.preview = false;
  });
  expect(await page.evaluate(() => (window as any).unsubscribed)).toBe(1);
  await expect(page.locator('navet-light-card').getByRole('slider')).toBeEnabled();
});

test('unrelated state changes do not render existing cards and 30 instances remain isolated', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const w = window as any;
    for (let i = 0; i < 23; i++) {
      const card = document.createElement('navet-switch-card') as any;
      card.setConfig({
        type: 'custom:navet-switch-card',
        entity: 'switch.coffee',
        name: `Switch ${i}`,
      });
      card.hass = w.demoHass;
      document.querySelector('#cards')!.append(card);
      w.cards.push(card);
    }
    await Promise.all(w.cards.map((card: any) => card.updateComplete));
    w.updates = 0;
    const card = w.cards[0];
    const original = card.render.bind(card);
    card.render = () => {
      w.updates++;
      return original();
    };
    w.demoHass = {
      ...w.demoHass,
      states: {
        ...w.demoHass.states,
        'sensor.unrelated': { entity_id: 'sensor.unrelated', state: '2', attributes: {} },
      },
    };
    w.syncCards();
    await card.updateComplete;
  });
  expect(await page.evaluate(() => (window as any).updates)).toBe(0);
  await expect(page.locator('#cards > *')).toHaveCount(30);
  await expect(page.locator('navet-switch-card').last().locator('.name')).toHaveText('Switch 22');
});

test('all supported themes and responsive widths keep contents inside each card', async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark', 'black', 'glass']) {
      await page.evaluate((theme) => {
        const w = window as any;
        w.cards.forEach((card: any, index: number) =>
          card.setConfig({
            ...w.configs[index],
            appearance: { theme },
            name: index === 0 ? 'Kitchen and dining room ceiling lights' : undefined,
          }),
        );
      }, theme);
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll('#cards > *')]
          .map((card) => {
            const inner = card.shadowRoot!.querySelector('.card')!;
            return { tag: card.tagName, overflow: inner.scrollWidth > inner.clientWidth + 1 };
          })
          .filter((item) => item.overflow),
      );
      expect(overflow, `${width}px ${theme}`).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.evaluate(() => {
    const w = window as any;
    w.cards.forEach((card: any, index: number) => card.setConfig(w.configs[index]));
  });
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 1100 });
  await page.screenshot({ path: 'test-results/phone.png', fullPage: true });
});

test('sensor text is escaped and missing entities display an explanation', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as any;
    w.demoHass = {
      ...w.demoHass,
      states: {
        ...w.demoHass.states,
        'sensor.temperature': {
          entity_id: 'sensor.temperature',
          state: '<script>alert(1)</script>',
          attributes: { friendly_name: 'Temperature' },
        },
      },
    };
    w.syncCards();
  });
  await expect(page.locator('navet-sensor-card').locator('.metric')).toHaveText(
    '<script>alert(1)</script>',
  );
  expect(await page.locator('navet-sensor-card').locator('script').count()).toBe(0);
  await page.evaluate(() => {
    const w = window as any;
    w.cards[2].setConfig({ type: 'custom:navet-sensor-card', entity: 'sensor.missing' });
  });
  await expect(page.locator('navet-sensor-card').locator('.metric')).toHaveText('Entity not found');
});

test('climate, media, and covers dispatch capability-aware native commands', async ({ page }) => {
  await page
    .locator('navet-media-card')
    .getByRole('button', { name: 'Pause', exact: true })
    .click();
  await page
    .locator('navet-climate-card')
    .getByRole('slider')
    .evaluate((input: HTMLInputElement) => {
      input.value = '22.5';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  await page.locator('navet-climate-card').getByRole('slider').dispatchEvent('change');
  await page
    .locator('navet-cover-card')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  expect(await page.evaluate(() => (window as any).calls.map((c: any) => c.service))).toEqual([
    'media_pause',
    'set_temperature',
    'close_cover',
  ]);
});

test('default Sections dimensions keep every control visible at narrow widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1100 });
  const overflow = await page.evaluate(async () => {
    const cards = (window as any).cards;
    for (const card of cards) {
      const rows = card.getGridOptions().rows;
      card.style.height = `${rows * 56 + (rows - 1) * 8}px`;
      await card.updateComplete;
    }
    return cards
      .map((card: any) => {
        const inner = card.shadowRoot.querySelector('.card');
        const container = inner.getBoundingClientRect();
        return {
          tag: card.tagName,
          clipped: [...inner.querySelectorAll('input,button,output')]
            .filter((control: any) => !control.closest('dialog'))
            .filter((control: any) => control.getBoundingClientRect().bottom > container.bottom - 8)
            .map((control: any) => ({ tag: control.tagName, className: control.className, bottom: control.getBoundingClientRect().bottom, containerBottom: container.bottom })),
        };
      })
      .filter((item: any) => item.clipped.length);
  });
  expect(overflow).toEqual([]);
});

test('unavailable media and climate state takes priority over cached details', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as any;
    const states = { ...w.demoHass.states };
    for (const id of ['media_player.kitchen', 'climate.kitchen'])
      states[id] = { ...states[id], state: 'unavailable' };
    w.demoHass = { ...w.demoHass, states };
    w.syncCards();
  });
  await expect(page.locator('navet-media-card').locator('.state')).toHaveText('Unavailable');
  await expect(page.locator('navet-climate-card').locator('.state')).toHaveText('Unavailable');
});

// Existing 13 tests: Keep. Their public command, isolation, accessibility and sizing contracts remain valid.
test('brightness presets and temperature steps work with keyboard and retain owning targets', async ({
  page,
}) => {
  const light = page.locator('navet-light-card');
  await light.getByRole('button', { name: 'Brightness 50%', exact: true }).press('Enter');
  await expect(light.getByRole('slider')).toHaveValue('50');
  const climate = page.locator('navet-climate-card');
  await climate.getByRole('button', { name: 'Increase temperature', exact: true }).press('Enter');
  await expect(climate.getByRole('slider')).toHaveValue('22.5');
  await climate.getByRole('button', { name: 'Decrease temperature', exact: true }).click();
  await expect(climate.getByRole('slider')).toHaveValue('22');
  const calls = await page.evaluate(() => (window as any).calls);
  expect(calls.map((call: any) => call.target.entity_id)).toEqual([
    'light.kitchen',
    'climate.kitchen',
    'climate.kitchen',
  ]);
  expect(calls.map((call: any) => call.data)).toEqual([
    { brightness_pct: 50 },
    { temperature: 22.5 },
    { temperature: 22 },
  ]);
});

test('cover position supports keyboard changes and broken artwork falls back', async ({ page }) => {
  const cover = page.locator('navet-cover-card');
  await cover.getByRole('slider', { name: 'Position' }).press('ArrowUp');
  await expect(cover.getByRole('slider')).toHaveValue('76');
  expect(await page.evaluate(() => (window as any).calls[0])).toMatchObject({
    service: 'set_cover_position',
    data: { position: 76 },
    target: { entity_id: 'cover.kitchen' },
  });
  await page.route('**/broken-artwork.jpg', (route) => route.fulfill({ status: 404, body: '' }));
  await page.evaluate(() => {
    const w = window as any;
    const entity = w.demoHass.states['media_player.kitchen'];
    w.demoHass = {
      ...w.demoHass,
      states: {
        ...w.demoHass.states,
        [entity.entity_id]: {
          ...entity,
          attributes: { ...entity.attributes, entity_picture: '/broken-artwork.jpg' },
        },
      },
    };
    w.syncCards();
  });
  await expect(page.locator('navet-media-card').locator('.artwork svg')).toBeVisible();
  await expect(
    page.locator('navet-media-card').getByRole('button', { name: 'Pause', exact: true }),
  ).toBeEnabled();
});

test('compact media volume popover remains usable with long track titles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const w = window as any;
    const old = w.demoHass.states['media_player.kitchen'];
    w.demoHass = {
      ...w.demoHass,
      states: {
        ...w.demoHass.states,
        [old.entity_id]: {
          ...old,
          attributes: {
            ...old.attributes,
            media_title: 'The best fireplace video playing in the living room',
            media_artist: 'Navet Studio',
          },
        },
      },
    };
    w.syncCards();
    const card = w.cards[4];
    const rows = card.getGridOptions().rows;
    card.style.height = `${rows * 56 + (rows - 1) * 8}px`;
  });
  const media = page.locator('navet-media-card');
  await media.getByRole('button', { name: 'Volume', exact: true }).press('Enter');
  await expect(media.getByRole('slider', { name: 'Volume', exact: true })).toBeVisible();
  await media.getByRole('slider', { name: 'Volume', exact: true }).press('ArrowRight');
  await expect(media.getByRole('slider', { name: 'Volume', exact: true })).toHaveValue('36');
  await media.getByRole('button', { name: 'Volume', exact: true }).press('Enter');
  await expect(media.getByRole('slider', { name: 'Volume', exact: true })).not.toBeVisible();
  await expect(media.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});

// Existing browser tests: Keep. Public configuration, command and lifecycle expectations are unchanged.
test('room controls are lazy, use owning targets, and unmount after Escape', async ({page}) => {
  const room=page.locator('navet-room-card');
  await expect(room.locator('.room-control')).toHaveCount(0);
  await room.getByRole('button',{name:'Controls',exact:true}).click();
  const light=room.locator('.room-control').filter({has:page.getByRole('button',{name:/Kitchen lights/})});
  await light.getByRole('button',{name:'Off',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).calls.at(-1).target.entity_id)).toBe('light.kitchen');
  await page.keyboard.press('Escape');
  await expect(room.locator('.room-control')).toHaveCount(0);
  await expect(room.getByRole('button',{name:'Controls',exact:true})).toBeFocused();
});
test('room navigation routes hashes, releases old panels, and cleans up on disconnect',async({page})=>{
  await page.evaluate(()=>{
    const w=window as any;w.cards[3].setConfig({...w.configs[3],panel_id:'#kitchen'});
    const nav=document.createElement('navet-navigation-card') as any;
    nav.setConfig({type:'custom:navet-navigation-card',links:[{name:'Kitchen',path:'#kitchen'},{name:'Home',path:'/demo/index.html'}]});nav.hass=w.demoHass;document.querySelector('#cards')!.append(nav);
  });
  await page.locator('navet-navigation-card').getByRole('button',{name:'Kitchen',exact:true}).click();
  await expect(page.locator('navet-room-card').getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/#kitchen$/);
  await page.keyboard.press('Escape');
  await expect(page).not.toHaveURL(/#kitchen$/);
  await page.evaluate(()=>{
    const room=(window as any).cards[3];room.remove();history.pushState(null,'','#kitchen');window.dispatchEvent(new Event('location-changed'));
  });
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});
test('number, select and conditional sub-controls react only to their dependencies',async({page})=>{
  await page.evaluate(()=>{
    const w=window as any;
    w.demoHass={...w.demoHass,states:{...w.demoHass.states,
      'input_number.offset':{entity_id:'input_number.offset',state:'-2',attributes:{friendly_name:'Offset',min:-10,max:10,step:.5}},
      'input_select.mode':{entity_id:'input_select.mode',state:'Eco',attributes:{friendly_name:'Mode',options:['Eco','Comfort']}},
      'binary_sensor.visible':{entity_id:'binary_sensor.visible',state:'off',attributes:{}}}};
    for(const config of [{type:'custom:navet-number-card',entity:'input_number.offset'},{type:'custom:navet-select-card',entity:'input_select.mode'}]){
      const card=document.createElement(config.type.replace('custom:','')) as any;card.setConfig(config);card.hass=w.demoHass;document.querySelector('#cards')!.append(card);w.cards.push(card);
    }
    w.cards[1].setConfig({...w.configs[1],sub_controls:[{entity:'light.kitchen',name:'Ceiling',control:'toggle',visible_when:{entity:'binary_sensor.visible',state:'on'}}]});w.syncCards();
  });
  await expect(page.locator('navet-switch-card').locator('.sub-control')).toHaveCount(0);
  await page.evaluate(()=>{const w=window as any;w.demoHass={...w.demoHass,states:{...w.demoHass.states,'binary_sensor.visible':{...w.demoHass.states['binary_sensor.visible'],state:'on'}}};w.syncCards();});
  await page.locator('navet-switch-card').locator('.sub-control').getByRole('button',{name:'Off',exact:true}).click();
  await page.locator('navet-number-card').getByRole('slider').press('ArrowRight');
  await page.locator('navet-select-card').getByRole('combobox').selectOption('Comfort');
  expect(await page.evaluate(()=>(window as any).calls.slice(-3))).toMatchObject([
    {domain:'light',service:'turn_off',target:{entity_id:'light.kitchen'}},
    {domain:'input_number',service:'set_value',data:{value:-1.5},target:{entity_id:'input_number.offset'}},
    {domain:'input_select',service:'select_option',data:{option:'Comfort'},target:{entity_id:'input_select.mode'}}]);
});
test('visible climate slider and low effects preserve controls across themes and row layout',async({page})=>{
  await expect(page.locator('navet-climate-card').getByRole('slider')).toBeVisible();
  expect(await page.locator('navet-climate-card').getByRole('slider').evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
  for(const theme of ['light','dark','black','glass']){
    await page.evaluate(theme=>{const w=window as any;w.cards[0].setConfig({...w.configs[0],layout:'row',appearance:{theme,effects:'low'}});},theme);
    await expect(page.locator('navet-light-card').getByRole('button',{name:'Kitchen lights',exact:true})).toBeVisible();
    expect(await page.locator('navet-light-card').locator('.card').evaluate(e=>getComputedStyle(e).backdropFilter)).toBe('none');
    if (!await page.locator('navet-light-card').locator('.advanced-controls').evaluate(e=>(e as HTMLDetailsElement).open)) await page.locator('navet-light-card').getByText('Controls',{exact:true}).click();
    await expect(page.locator('navet-light-card').getByRole('slider')).toBeVisible();
  }
});
test('dropdowns reflect non-first state and failed choices restore the current state',async({page})=>{
  await page.evaluate(()=>{
    const w=window as any;const host={...w.demoHass,states:{...w.demoHass.states,'input_select.mode':{entity_id:'input_select.mode',state:'Comfort',attributes:{options:['Eco','Comfort']}}},callService:async()=>{throw new Error('Rejected');}};
    const card=document.createElement('navet-select-card') as any;card.setConfig({type:'custom:navet-select-card',entity:'input_select.mode'});card.hass=host;document.querySelector('#cards')!.append(card);
  });
  const card=page.locator('navet-select-card');await expect(card.getByRole('combobox')).toHaveValue('Comfort');
  await card.getByRole('combobox').selectOption('Eco');await expect(card.getByRole('alert')).toHaveText('Rejected');
  await expect(card.getByRole('combobox')).toHaveValue('Comfort');
});
test('room hash opens after late host assignment and preview blocks navigation',async({page})=>{
  await page.evaluate(()=>{
    const w=window as any;history.pushState(null,'','#late');const card=document.createElement('navet-room-card') as any;
    card.setConfig({type:'custom:navet-room-card',entities:['light.kitchen'],panel_id:'#late'});document.querySelector('#cards')!.append(card);w.late=card;card.hass=w.demoHass;
  });
  const room=page.locator('navet-room-card').last();await expect(room.getByRole('dialog')).toBeVisible();
  await page.evaluate(()=>(window as any).late.preview=true);await expect(room.getByRole('dialog')).not.toBeVisible();
  await page.evaluate(()=>(window as any).late.preview=false);await expect(room.getByRole('dialog')).toBeVisible();
});
test('sub-control display overrides stay scoped to the primary entity',async({page})=>{
  await page.evaluate(()=>{
    const w=window as any;w.cards[2].setConfig({...w.configs[2],attribute:'battery',unit:'%',sub_controls:[{entity:'sensor.temperature',name:'Room reading'}]});
  });
  await expect(page.locator('navet-sensor-card').locator('.sub-control .state')).toHaveText('21.4 °C');
});
test('multiple cover controls stay within their own room rows',async({page})=>{
  await page.evaluate(()=>{
    const w=window as any;w.demoHass={...w.demoHass,states:{...w.demoHass.states,'cover.other':{...w.demoHass.states['cover.kitchen'],entity_id:'cover.other',attributes:{...w.demoHass.states['cover.kitchen'].attributes,friendly_name:'Other blinds'}}}};
    w.cards[3].setConfig({type:'custom:navet-room-card',entities:['cover.kitchen','cover.other']});w.syncCards();
  });
  const room=page.locator('navet-room-card');await room.getByRole('button',{name:'Controls',exact:true}).click();
  const bounds=await room.locator('.room-control').evaluateAll(rows=>rows.map(row=>{const a=row.getBoundingClientRect();const b=row.querySelector('input')!.getBoundingClientRect();return b.top>=a.top && b.bottom<=a.bottom && b.left>=a.left && b.right<=a.right;}));
  expect(bounds).toEqual([true,true]);
});
test('legacy explicit family heights retain controls when richer capabilities are advertised',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{
    const w=window as any;w.demoHass={...w.demoHass,states:{...w.demoHass.states,
      'light.kitchen':{...w.demoHass.states['light.kitchen'],attributes:{...w.demoHass.states['light.kitchen'].attributes,supported_color_modes:['color_temp'],min_color_temp_kelvin:2000,max_color_temp_kelvin:6000}},
      'climate.kitchen':{...w.demoHass.states['climate.kitchen'],attributes:{...w.demoHass.states['climate.kitchen'].attributes,hvac_modes:['off','heat']}},
      'media_player.kitchen':{...w.demoHass.states['media_player.kitchen'],attributes:{...w.demoHass.states['media_player.kitchen'].attributes,supported_features:18493,source_list:['Radio','TV'],source:'Radio'}}}};
    for(const [i,rows] of [[0,3],[4,4],[5,4]]){w.cards[i].setConfig({...w.configs[i],grid_options:{rows}});w.cards[i].style.height=`${rows*56+(rows-1)*8}px`;}w.syncCards();
  });
  for(const tag of ['navet-light-card','navet-media-card','navet-climate-card']){
    expect(await page.locator(tag).evaluate(card=>{const a=card.getBoundingClientRect();return [...card.shadowRoot!.querySelectorAll('input,button')].filter(e=>e.checkVisibility()&&!e.closest('details:not([open])')).every(e=>{const b=e.getBoundingClientRect();return b.top>=a.top-1&&b.bottom<=a.bottom+1;});})).toBe(true);
  }
  await page.locator('navet-media-card').getByRole('button',{name:'Controls',exact:true}).click();
  await page.locator('navet-media-card').getByRole('combobox',{name:'Source',exact:true}).selectOption('TV');
  expect(await page.evaluate(()=>(window as any).calls.at(-1))).toMatchObject({service:'select_source',data:{source:'TV'},target:{entity_id:'media_player.kitchen'}});
  for(const layout of ['compact','row']) {
    await page.evaluate(layout=>{const w=window as any;w.cards[4].setConfig({...w.configs[4],layout,appearance:{theme:'light'}});},layout);
    if(!await page.locator('navet-media-card').getByRole('combobox',{name:'Source',exact:true}).isVisible()) await page.locator('navet-media-card').locator('summary').click();
    expect(await page.locator('navet-media-card').getByRole('combobox',{name:'Source',exact:true}).evaluate(e=>({text:getComputedStyle(e).color,surface:getComputedStyle(e).backgroundColor}))).toEqual({text:'rgb(238, 238, 238)',surface:'rgb(37, 37, 41)'});
  }
});
