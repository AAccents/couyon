// Optional developer runner: npm install --no-save playwright, then node tests/validate.cjs.
// The application itself remains dependency-free. CHROME_CHANNEL defaults to chrome.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
require('./artwork-freshness.cjs');
const root = path.resolve(__dirname, '..');
const output = process.env.PROOF_TEST_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'couyon-'));
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const name = req.url === '/test.html' ? 'test.html' : req.url === '/artwork.js' ? 'artwork.js' : ['/', '/index.html'].includes(req.url) ? 'index.html' : null;
  if (!name) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8');
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
    await page.selectOption('#bracket', 'AA-BRACKET-DOGWOOD-30');
    await page.screenshot({ path: path.join(output, 'dogwood.png'), fullPage: true });
    await page.selectOption('#post', 'AA-POST-SQUARE-4');
    await page.selectOption('#base', 'AA-BASE-SQUARE-DECORATIVE');
    await page.selectOption('#finial', 'AA-FINIAL-SF4P');
    await page.selectOption('#config', '2');
    await page.screenshot({ path: path.join(output, 'square-offset.png'), fullPage: true });
    await page.check('#noStreet2');
    assert.equal(await page.locator('#config').isDisabled(), true);
    await page.screenshot({ path: path.join(output, 'single-street.png'), fullPage: true });
    await page.uncheck('#noStreet2');
    assert.equal(await page.locator('#config').inputValue(), '2');
    await page.selectOption('#post', 'AA-POST-UCHANNEL');
    assert.equal(await page.locator('#finial').inputValue(), 'AA-FINIAL-NONE');
    assert.equal(await page.locator('#base').inputValue(), 'AA-BASE-NONE');
    await page.selectOption('#bracket', 'AA-BRACKET-NONE');
    await page.screenshot({ path: path.join(output, 'u-channel.png'), fullPage: true });
    await page.fill('#street1', 'W'.repeat(60));
    assert.equal(await page.locator('[data-part="street-text"][data-street="0"]').textContent(), 'REVIEW NAME');
    assert.equal(await page.locator('#exportProof').isDisabled(), true);
    assert.equal(await page.evaluate(() => exportSVG()), false, 'direct export must also reject conflicts');
    assert.equal(await page.evaluate(() => printProof()), false, 'direct print must reject conflicts');
    await page.screenshot({ path: path.join(output, 'lettering-conflict.png'), fullPage: true });
    await page.fill('#street1', 'Oak Ln');
    await page.fill('#street2', 'A&B <C>');
    await page.selectOption('#post', 'AA-POST-ROUND-238-SMOOTH');
    await page.selectOption('#base', 'AA-BASE-CORINTHIAN');
    await page.selectOption('#finial', 'AA-FINIAL-3DC');
    await page.selectOption('#bracket', 'AA-BRACKET-DOGWOOD-30');
    assert.equal(await page.locator('[data-part="street-text"][data-street="1"]').textContent(), 'A&B <C>');
    const boundsFit = await page.evaluate(() => [...document.querySelectorAll('[data-part="street-text"]')].every(t => {
      const b = document.querySelector(`[data-part="blade"][data-street="${t.dataset.street}"]`).getBBox();
      const r = t.getBBox();
      return r.x >= b.x+6 && r.x+r.width <= b.x+b.width-6;
    }));
    assert.ok(boundsFit, 'accepted names must fit their individual blades');
    const forbiddenCustomerText = await page.evaluate(() => [...new Set([
      ...Object.values(DATA).filter(Array.isArray).flatMap(items=>items.flatMap(item=>[
        item.id,
        item.family,
        typeof item.artwork === 'string' ? item.artwork : null,
        ...(item.vendor || []).flatMap(v=>[v.name,v.sku])
      ])),
      ...Object.values(ART).flatMap(item=>[item.id,item.provenance.assetId,item.provenance.assetFile]),
      'vendor-supported','reference-derived','representative artwork','provisional','placeholder','fit unverified'
    ].filter(Boolean))]);
    assert.match(await page.locator('#sumPost').innerText(),/AA-POST-ROUND-238-SMOOTH.*TCP-238-BPP/,'internal screen summary retains AA and vendor identity');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export SVG' }).click();
    const download = await downloadPromise;
    const exported = path.join(output, download.suggestedFilename());
    await download.saveAs(exported);
    const exportCheck = await page.evaluate(({source,forbiddenCustomerText}) => {
      const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
      const customerProof = JSON.parse(doc.querySelector('metadata').textContent);
      const disclosure = doc.querySelector('desc').textContent;
      const checks = {
        parses:!doc.querySelector('parsererror'), title:!!doc.querySelector('title'),
        post:customerProof.components.post === '2 3/8 in Round Smooth Post — 12 ft',
        finial:customerProof.components.finial === '3 in Dome Cap',
        base:customerProof.components.base === 'Corinthian Base',
        bracket:customerProof.components.bracket === 'Dogwood Bracket — 30 in Blade',
        blade:customerProof.components.blade === '9 in Street-Name Blade',
        lettering:customerProof.lettering.every(result=>result.result==='Fits proof minimum'),
        disclosure:disclosure.includes('2 3/8 in Round Smooth Post') && disclosure.includes('Confirm selected components'),
        postDefs:!!doc.querySelector('[data-part="post-artwork"] defs'),
        postPaint:!!doc.querySelector('[data-part="post-artwork"] [fill], [data-part="post-artwork"] [stroke]'),
        references:[...doc.querySelectorAll('[clip-path], [fill], [stroke]')].every(node=>
          [...node.attributes].filter(a=>/url\(#/.test(a.value)).every(a=>{
            const id=a.value.match(/url\(#([^)]+)\)/)?.[1]; return id && doc.getElementById(id);
          })),
        qualification:doc.documentElement.textContent.includes('Not for fabrication'),
        blades:doc.querySelectorAll('[data-part="blade"]').length === 2,
        leaked:forbiddenCustomerText.filter(secret=>{
          const escaped=secret.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          return new RegExp(`(^|[^A-Za-z0-9])${escaped}($|[^A-Za-z0-9])`).test(source);
        })
      };
      return {pass:Object.entries(checks).every(([key,value])=>key==='leaked' ? value.length===0 : value),checks};
    }, {source:fs.readFileSync(exported, 'utf8'),forbiddenCustomerText});
    assert.ok(exportCheck.pass,`standalone SVG must parse and contain customer-safe identity only: ${JSON.stringify(exportCheck.checks)}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile page overflow');
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    await page.fill('#street1', 'Oak Ln');
    await page.fill('#street2', 'Pine St');
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.controls').isVisible(), false);
    assert.equal(await page.locator('.summary').isVisible(), false,'internal summary must not print');
    const printText = await page.locator('body').innerText();
    assert.ok(forbiddenCustomerText.every(secret=>!printText.includes(secret)),'print-visible text must exclude internal identity and confidence data');
    await page.pdf({ path: path.join(output, 'proof.pdf'), format: 'Letter', printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await require('./integrity.cjs')(page,output);
    await require('./phase2.cjs')(page,output);
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
    const contactResults = await page.evaluate(() => window.__testResults);
    console.log(contactResults);
    assert.equal(contactResults.finialChecks,60,'finial mounting matrix must execute');
    assert.equal(contactResults.baseChecks,25,'base joint matrix must execute');
    assert.equal(contactResults.assemblyChecks,252,'assembly matrix must execute');
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
