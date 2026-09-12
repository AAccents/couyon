const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async function validateIntegrity(page, output) {
  const facts = await page.evaluate(() => {
    const before = JSON.stringify(DATA);
    const widths = [];
    for (const post of DATA.posts.keys()) for (const config of [0,1,2]) {
      $('post').value = DATA.posts[post].id; $('config').value = config; update();
      widths.push(__proofDebug.postPxW);
    }
    return { widths, unchanged: before === JSON.stringify(DATA),
      noInventedWidth: physicalValue(DATA.posts.at(-1),'widthIn') === null,
      noInventedReach: DATA.brackets.slice(1).every(b=>physicalValue(b,'reachIn') === null),
      unknownStaysUnknown: proofDimension({dimensions:{}},'widthIn') === null,
      unknownRejected: physicalValue({dimensions:{widthIn:{value:3,confidence:'unknown',source:'map'}}},'widthIn') === null,
      identities: [...DATA.blades,...DATA.brackets,...DATA.finials,...DATA.posts,...DATA.bases]
        .every(c=>c.id && Array.isArray(c.vendor) && c.customer?.name),
      uniqueIds: new Set([...DATA.blades,...DATA.brackets,...DATA.finials,...DATA.posts,...DATA.bases].map(c=>c.id)).size ===
        [...DATA.blades,...DATA.brackets,...DATA.finials,...DATA.posts,...DATA.bases].length,
      customerBoundary: customerSummary(DATA.posts[0].customer)==='2 3/8 in Round Smooth Post' && customerSummary(DATA.posts[0])==='Component',
      none: [...DATA.finials,...DATA.bases,...DATA.brackets].filter(c=>c.style==='none').every(c=>customerSummary(c.customer).startsWith('No ')),
      sb46: DATA.bases[2],
      provisional: [DATA.bases[2],DATA.brackets[1]].every(c=>internalSummary(c).toLowerCase().includes('provisional')),
      pineapple: internalSummary(DATA.finials.find(f=>f.id==='AA-FINIAL-3DP')) };
  });
  assert.deepEqual(facts.widths,[11.875,11.875,11.875,15,15,15,15,15,15,20,20,20,20,20,20,20,20,20,12.5,12.5,12.5]);
  for (const key of ['unchanged','noInventedWidth','noInventedReach','unknownStaysUnknown','unknownRejected','identities','uniqueIds','customerBoundary','none','provisional']) assert.ok(facts[key],key);
  assert.equal(facts.sb46.dimensions.heightIn.value,29);
  assert.equal(facts.sb46.dimensions.heightIn.confidence,'vendor-supported');
  assert.match(facts.pineapple,/proportion-verified artwork/);

  // Synthetic dimensions only, restored before leaving this test. They are not
  // catalog additions or claims about real bracket products.
  const physical = await page.evaluate(() => {
    const bracket = DATA.brackets[1], saved = structuredClone(bracket.dimensions);
    SOURCES.fixture = 'Synthetic test source — not vendor data';
    const scales = [], fallbackScales = [];
    try {
      $('post').value=DATA.posts[0].id; $('bracket').value=bracket.id; $('base').value=DATA.bases[1].id;
      $('noStreet1').checked=false; $('noStreet2').checked=false;
      for (const config of [0,1,2]) { $('config').value=config; update(); fallbackScales.push(__proofDebug.stations[0].bracketScale); }
      bracket.dimensions.reachIn={value:18,confidence:'vendor-supported',source:'fixture'};
      for (const config of [0,1,2]) for (const single of [false,true]) {
        $('config').value=config; $('noStreet2').checked=single; update();
        scales.push({ scale:__proofDebug.stations[0].bracketScale, mode:__proofDebug.stations[0].bracketSizingMode });
      }
      bracket.dimensions.reachIn.value=100;
      update();
      return {scales,fallbackScales,oversizeBlocked:__proofDebug.integrity.blocked,
        physicalPreferred:proofDimension({dimensions:{widthIn:{value:4,confidence:'vendor-supported',source:'fixture'}},presentation:{widthIn:99}},'widthIn')};
    } finally {
      bracket.dimensions=saved; delete SOURCES.fixture;
      $('noStreet2').checked=false; $('bracket').value=DATA.brackets[0].id; update();
    }
  });
  assert.ok(physical.scales.every(s=>s.mode==='physical' && Math.abs(s.scale-90/90.5)<1e-9));
  assert.notEqual(physical.fallbackScales[0],physical.fallbackScales[2]);
  assert.ok(physical.oversizeBlocked,'known reach must not shrink to fit');
  assert.equal(physical.physicalPreferred,4);

  await page.fill('#street2','Pine St');
  const outcomes=[];
  for (const name of ['Oak','Oak Grove','Birch Lane','Birch Road','Willow Way','Cypress Ln','Maple Street','Cedar Grove','Madison Ave','Washington St',
    'Martin Luther King Jr Boulevard','North Saint Charles Avenue','Old Spanish Trail Highway','West Shoreline Drive']) {
    await page.fill('#street1',name);
    outcomes.push(await page.evaluate(() => structuredClone(__proofDebug.integrity.lettering[0])));
  }
  console.log('Lettering samples:',outcomes.map(r=>`${r.name}:${r.status}:${r.capHeightIn}`).join(', '));
  assert.ok(outcomes.some(r=>r.status==='normal'),'short name has a normal state');
  assert.ok(outcomes.some(r=>r.status==='adjusted'),'proportional fit has a valid adjusted state');
  assert.ok(outcomes.slice(-4).every(r=>r.status==='conflict'),'long real names cannot silently shrink');
  assert.ok(outcomes.filter(r=>['normal','adjusted'].includes(r.status)).every(r=>r.capHeightIn >= r.minimumIn));
  await page.screenshot({path:path.join(output,'long-real-name.png'),fullPage:true});
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.canvas').isVisible(),false,'native print suppresses unresolved drawing');
  await page.emulateMedia({media:'screen'});
  await page.check('#noStreet1');
  assert.equal(await page.locator('#exportProof').isDisabled(),false,'hidden invalid name is excluded');
  await page.uncheck('#noStreet1');
  await page.fill('#street1','   ');
  assert.match(await page.locator('#letteringStatus').innerText(),/enter a name/);
  assert.equal(await page.locator('#exportProof').isDisabled(),true);
  await page.fill('#street1','Oak');
  await page.selectOption('#bracket','AA-BRACKET-DOGWOOD-30');
  await page.screenshot({path:path.join(output,'valid-lettering.png'),fullPage:true});

  // Independently rasterize an SVG capital H in the actual rendered font.
  // This checks ink rather than repeating the canvas TextMetrics calculation.
  const ink = await page.evaluate(async () => {
    const text=document.querySelector('[data-part="street-text"]');
    const rasterHeight=async factor=>{
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('width',512); svg.setAttribute('height',512);
      const glyph=text.cloneNode(true);
      glyph.textContent='H'; glyph.setAttribute('x',40); glyph.setAttribute('y',400);
      glyph.removeAttribute('dominant-baseline'); glyph.setAttribute('text-anchor','start');
      glyph.setAttribute('font-size',+text.getAttribute('font-size')*8*factor);
      glyph.setAttribute('fill','#000'); svg.appendChild(glyph);
      const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
      try {
        const img=new Image(); img.src=url; await img.decode();
        const c=document.createElement('canvas'); c.width=c.height=512;
        const ctx=c.getContext('2d'); ctx.drawImage(img,0,0);
        const data=ctx.getImageData(0,0,512,512).data;
        let first=512,last=-1;
        for(let y=0;y<512;y++) for(let x=0;x<512;x++) if(data[(y*512+x)*4+3]>128){first=Math.min(first,y);last=Math.max(last,y);}
        return (last-first+1)/8/5;
      } finally { URL.revokeObjectURL(url); }
    };
    const normal=await rasterHeight(1), undersized=await rasterHeight(.5);
    return {normal,undersized,reported:__proofDebug.integrity.lettering[0].capHeightIn,
      minimum:__proofDebug.integrity.lettering[0].minimumIn,fontIn:+text.getAttribute('font-size')/5};
  });
  assert.ok(ink.normal >= ink.minimum-.04);
  assert.ok(Math.abs(ink.normal-ink.reported)<.04,'ink-height estimate matches independent SVG raster');
  assert.ok(ink.undersized < ink.minimum,'ink check rejects half-size lettering');
  assert.ok(Math.abs(ink.fontIn-ink.normal)>.5,'CSS font-size is not cap height');
  console.log('Integrity checks: dimensions/provenance, physical reach, lettering states and independent SVG ink measurement passed.');
  console.log(JSON.stringify({lettering:outcomes.map(r=>({name:r.name,state:r.status,capHeightIn:r.capHeightIn})),ink}));
};
