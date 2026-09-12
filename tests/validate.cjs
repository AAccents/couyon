// Optional developer runner: npm install --no-save playwright, then node tests/validate.cjs.
// The application itself remains dependency-free. CHROME_CHANNEL defaults to chrome.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = process.env.PROOF_TEST_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'couyon-'));
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const name = req.url === '/test.html' ? 'test.html' : ['/', '/index.html'].includes(req.url) ? 'index.html' : null;
  if (!name) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(fs.readFileSync(path.join(root, name)));
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.error('Browser:', e.message); });
    await page.route('https://api.github.com/**', route => route.abort());
    await page.goto(url);
    await page.screenshot({ path: path.join(output, 'default.png'), fullPage: true });
    await page.selectOption('#bracket', '1');
    await page.screenshot({ path: path.join(output, 'dogwood.png'), fullPage: true });
    await page.selectOption('#post', '2');
    await page.selectOption('#base', '2');
    await page.selectOption('#finial', '1');
    await page.selectOption('#config', '2');
    await page.screenshot({ path: path.join(output, 'square-offset.png'), fullPage: true });
    await page.check('#noStreet2');
    assert.equal(await page.locator('#config').isDisabled(), true);
    await page.screenshot({ path: path.join(output, 'single-street.png'), fullPage: true });
    await page.uncheck('#noStreet2');
    assert.equal(await page.locator('#config').inputValue(), '2');
    await page.selectOption('#post', '3');
    assert.equal(await page.locator('#finial').inputValue(), '0');
    assert.equal(await page.locator('#base').inputValue(), '0');
    await page.selectOption('#bracket', '0');
    await page.screenshot({ path: path.join(output, 'u-channel.png'), fullPage: true });
    await page.fill('#street1', 'W'.repeat(60));
    await page.fill('#street2', '<Oak & Pine>');
    assert.equal(await page.locator('[data-part="street-text"][data-street="1"]').textContent(), '<Oak & Pine>');
    const boundsFit = await page.evaluate(() => [...document.querySelectorAll('[data-part="street-text"]')].every(t => {
      const b = document.querySelector(`[data-part="blade"][data-street="${t.dataset.street}"]`).getBBox();
      const r = t.getBBox();
      return r.x >= b.x+6 && r.x+r.width <= b.x+b.width-6;
    }));
    assert.ok(boundsFit, 'long and escaped names must fit their individual blades');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export SVG' }).click();
    const download = await downloadPromise;
    const exported = path.join(output, download.suggestedFilename());
    await download.saveAs(exported);
    const exportCheck = await page.evaluate(source => {
      const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
      return !doc.querySelector('parsererror') && !!doc.querySelector('title') &&
        doc.documentElement.textContent.includes('Not for fabrication') &&
        doc.querySelectorAll('[data-part="blade"]').length === 2;
    }, fs.readFileSync(exported, 'utf8'));
    assert.ok(exportCheck, 'standalone SVG must parse and retain proof qualification');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile page overflow');
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.controls').isVisible(), false);
    await page.pdf({ path: path.join(output, 'proof.pdf'), format: 'Letter', printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(url + '/test.html');
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Base joint:'), null, { timeout: 60000 }).catch(async e => {
      console.error(await page.locator('body').innerText());
      throw e;
    });
    console.log(await page.locator('#status').innerText());
    await page.selectOption('#zoom', 'full');
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Base joint:'), null, { timeout: 60000 });
    await page.screenshot({ path: path.join(output, 'contact-sheet.png'), fullPage: true });
    const failures = await page.locator('.cell.bad').count();
    if (failures) console.log(await page.locator('.cell.bad').allInnerTexts());
    console.log(await page.evaluate(() => window.__testResults));
    const negativeControls = await page.evaluate(() => {
      choose('post', 0); choose('base', 1); choose('finial', 3);
      choose('bracket', 1); choose('config', 0);
      toggle('noStreet1', false); toggle('noStreet2', false);
      const verify = mutate => {
        W().update();
        mutate(D());
        return !assemblyInvariant(D(), W().__proofDebug).pass;
      };
      const result = [
        verify(d => d.querySelector('[data-part="bracket"]').setAttribute('transform', 'translate(100 0)')),
        verify(d => d.querySelector('[data-part="street-text"]').setAttribute('font-size', '100')),
        verify(d => d.querySelector('[data-part="blade"]').remove()),
        verify(d => d.getElementById('assembly').prepend(d.querySelector('[data-part="base"]')))
      ];
      W().update();
      return result;
    });
    assert.ok(negativeControls.every(Boolean), 'invariants must reject deliberate geometry regressions');
    console.log('Four deliberate regressions rejected; export, state, long names, mobile and print checks passed.');
    console.log(JSON.stringify({ failures, errors, output }));
    if (failures || errors.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
