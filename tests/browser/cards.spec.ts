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
