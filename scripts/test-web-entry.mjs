import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE, 'index.mjs')).href : 'playwright');
const site = process.env.SITE_URL || 'http://127.0.0.1:5187/';
const output = process.env.QA_OUTPUT || 'output/web-entry';
await mkdir(output, { recursive: true });
const report = { scenarios: [], errors: [] };
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
const contexts = new Set();
async function scenario(name, options, run) {
  if (process.env.QA_SCENARIO && name !== process.env.QA_SCENARIO) return;
  console.log(`Checking ${name}`);
  const context = await browser.newContext(options);
  contexts.add(context);
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(20000);
  try {
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ scenario: name, message: error.message, stack: error.stack }));
    await run(page, context);
    report.scenarios.push({ name, status: 'passed' });
  } catch (error) {
    report.scenarios.push({ name, status: 'failed', error: String(error) });
    throw error;
  } finally { await context.close(); contexts.delete(context); }
}
async function landing(page, mode) {
  await page.goto(site, { waitUntil: 'domcontentloaded' });
  await page.locator('.hero__try-it').waitFor();
  await page.evaluate(mode => document.documentElement.classList.toggle('is-night-theme', mode === 'dark'), mode);
}
const ready = page => page.locator('.web-entry[data-state="ready"]').waitFor();
async function back(page) {
  // App routes also use browser history. Traverse those before the website entry.
  for (let step = 0; step < 6 && new URL(page.url()).hash === '#try-it'; step++) {
    await page.evaluate(() => history.back());
    await page.waitForFunction(() => location.hash !== '#try-it', null, { timeout: 500 }).catch(error => {
      if (error.name !== 'TimeoutError') throw error;
    });
  }
  await page.locator('.web-entry').waitFor({ state: 'detached' });
  assert.equal(await page.locator('iframe.web-entry__app').count(), 0);
  assert.equal(await page.evaluate(() => document.body.classList.contains('is-web-app-open')), false);
  assert.equal(await page.locator('.hero__try-it').evaluate(el => el === document.activeElement), true);
}

try {
  for (const mode of ['dark', 'light']) {
    await scenario(`desktop-${mode}-live-app`, { viewport: { width: 1440, height: 900 } }, async (page, context) => {
      await context.addInitScript(mode => {
        if (location.port === '5173') localStorage.setItem('preacherman.preferences', JSON.stringify({
          appearance: mode, locale: 'en', activeModelId: 'apex-legend-pathfinder',
        }));
      }, mode);
      await landing(page, mode);
      await page.locator('.hero__try-it').focus();
      await page.keyboard.press('Enter');
      await page.locator('.web-entry').waitFor();
      const motion = await page.locator('.web-entry').evaluate(el => {
        const animation = el.getAnimations()[0];
        if (!animation) return null;
        animation.pause(); animation.currentTime = 100;
        const rect = el.getBoundingClientRect();
        return { duration: animation.effect.getTiming().duration, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width };
      });
      assert.ok(motion && motion.duration === 760);
      assert.ok(Math.abs(motion.x - 720) < 1 && Math.abs(motion.y - 450) < 1);
      assert.ok(motion.width > 1440 * 0.16 && motion.width < 1440);
      await page.screenshot({ path: path.join(output, `${mode}-expanding.png`) });
      await page.locator('.web-entry').evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
      await ready(page);
      const frame = page.frameLocator('iframe.web-entry__app');
      await frame.locator('.demo-app-shell[data-active-surface="home"]').waitFor({ timeout: 45000 });
      assert.equal(await frame.locator('html').getAttribute('data-appearance'), mode);
      await frame.locator('.cortana-model-stage__loading').waitFor({ state: 'hidden', timeout: 45000 });
      await frame.getByRole('button', { name: 'Open Preacherman navigation', exact: true }).click();
      await frame.getByRole('button', { name: 'Settings', exact: true }).click();
      await frame.locator('.demo-app-shell[data-active-surface="settings"]').waitFor();
      await frame.getByText('Execution Mode', { exact: true }).waitFor({ timeout: 15000 });
      // Let the app's authored 700 ms page/camera entrance settle for the still.
      await page.waitForTimeout(900);
      assert.equal(await frame.locator('.cortana-model-stage__error').count(), 0);
      await page.screenshot({ path: path.join(output, `${mode}-interactive-app.png`) });
      assert.equal(await page.locator('iframe.web-entry__app').count(), 1);
      assert.equal(await page.locator('[data-pathfinder-stage]').getAttribute('data-render-active'), 'false');
      await back(page);
      await page.evaluate(() => history.forward());
      await ready(page);
      assert.equal(await page.locator('iframe.web-entry__app').count(), 1);
      await back(page);
    });
  }

  for (const mode of ['dark', 'light']) {
    await scenario(`mobile-${mode}-reduced-motion-errors`, {
      viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: 'reduce',
    }, async (page) => {
      await page.route('http://localhost:5173/**', route => route.abort('connectionrefused'));
      await landing(page, mode);
      await page.locator('.hero__try-it').click();
      await page.locator('.web-entry[data-state="error"]').waitFor();
      assert.equal(await page.locator('iframe.web-entry__app').count(), 0);
      const style = await page.locator('.web-entry').evaluate(el => ({
        width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
        background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color,
        animated: el.getAnimations().length,
      }));
      assert.equal(style.width, 390); assert.equal(style.height, 844); assert.equal(style.animated, 0);
      assert.notEqual(style.background, style.color);
      await page.screenshot({ path: path.join(output, `${mode}-mobile-error.png`) });
      await page.unroute('http://localhost:5173/**');
      await page.route('http://localhost:5173/**', route => route.fulfill({
        contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' },
        body: '<!doctype html><html><body><button>Ready</button></body></html>',
      }));
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await ready(page);
      await page.frameLocator('iframe').getByRole('button', { name: 'Ready' }).click();
      await back(page);
      // Back during a pending load must cancel it and release background controls.
      await page.unroute('http://localhost:5173/**');
      await page.route('http://localhost:5173/**', () => {});
      await page.locator('.hero__try-it').click();
      await page.locator('.web-entry[data-state="loading"]').waitFor();
      await back(page);
    });
  }
  await scenario('production-no-loopback', { viewport: { width: 1280, height: 800 } }, async (page) => {
    const response = await page.request.get(new URL('preacherman-entry.js', site).href);
    const script = await response.text();
    await page.route('https://marketing.example/**', route => route.fulfill({ contentType: 'text/html', body:
      '<html lang="en"><body><button class="hero__try-it">Try It</button></body></html>' }));
    await page.goto('https://marketing.example/');
    await page.addScriptTag({ type: 'module', content: script });
    await page.getByRole('button', { name: 'Try It', exact: true }).click();
    await page.locator('.web-entry[data-state="error"]').waitFor();
    assert.match(await page.locator('[data-entry-status]').textContent(), /coming soon/);
    assert.equal(await page.locator('iframe').count(), 0);
    assert.equal(await page.locator('[data-entry-retry]').isVisible(), false);
  });
  const newErrors = report.errors.filter(error => !error.message.includes("Identifier '$' has already been declared"));
  assert.deepEqual(newErrors, [], 'No new browser JavaScript errors');
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
