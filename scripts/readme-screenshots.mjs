import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: process.env.NAVET_BROWSER_CHANNEL });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const base = `http://127.0.0.1:${process.env.NAVET_PREVIEW_PORT || 4178}`;
  await page.goto(`${base}/demo/index.html`);
  await page.waitForFunction(() => window.catalogCards?.length === 19 && window.cards?.length === 7);
  await page.evaluate(async () => { await Promise.all([...window.cards, ...window.catalogCards].map(card => card.updateComplete)); });
  await page.locator('#catalog navet-photo-card img').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/images/dashboard.png', fullPage: true });
  await page.locator('#cards').screenshot({ path: 'docs/images/composition.png' });
  await page.goto(`${base}/demo/composition.html`);
  await page.locator('navet-room-card').first().getByRole('button', {name: 'Controls', exact: true}).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.getByRole('dialog').screenshot({ path: 'docs/images/room-controls.png' });
} finally { await browser.close(); }
