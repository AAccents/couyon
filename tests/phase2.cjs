const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async function validatePhase2(page, output) {
  await page.reload();
  await page.waitForFunction(() => window.__proofDebug);

  const catalog = await page.evaluate(() => {
    const posts=DATA.posts.map(p=>({
      id:p.id, artwork:p.artwork, profile:p.profile, dimensions:p.dimensions,
      lengths:p.lengths, provides:p.interfaces.provides
    }));
    const finials=DATA.finials.map(f=>({
      id:f.id, sku:preferredVendor(f)?.sku || null, artwork:f.artwork,
      compatible:f.knownCompatiblePostIds || []
    }));
    const frames=Object.fromEntries(Object.entries(ART).filter(([,a])=>a.kind==='finial')
      .map(([id,a])=>[id,{mateWidth:a.frame.mateWidth,embedDepth:a.frame.embedDepth}]));
    const compatibility=[];
    for(const post of DATA.posts) for(const finial of DATA.finials) {
      compatibility.push({post:post.id,finial:finial.id,issues:validateAssembly({post,finial,base:DATA.bases[0]})});
    }
    return {
      posts,finials,frames,compatibility,
      defaults:{post:$('post').value,finial:$('finial').value,length:$('postLength').value},
      spear:DATA.finials.some(f=>f.style==='spear' || preferredVendor(f)?.sku==='SPEAR')
    };
  });

  assert.deepEqual(catalog.posts.map(p=>[p.id,p.artwork]),[
    ['AA-POST-ROUND-238-SMOOTH','post.smooth-round'],
    ['AA-POST-ROUND-3-SMOOTH','post.smooth-round'],
    ['AA-POST-ROUND-3-FLUTED','post.fluted-round'],
    ['AA-POST-ROUND-4-SMOOTH','post.smooth-round'],
    ['AA-POST-ROUND-4-FLUTED','post.fluted-round'],
    ['AA-POST-SQUARE-4','post.square'],
    ['AA-POST-UCHANNEL',null]
  ]);
  assert.ok(catalog.posts.slice(0,6).every(p=>p.lengths.default===12 &&
    JSON.stringify(p.lengths.values)==='[10,11,12,13]'));
  assert.deepEqual(catalog.posts.slice(0,5).map(p=>p.dimensions.diameterIn.value),[2.375,3,3,4,4]);
  assert.equal(catalog.posts[5].dimensions.faceWidthIn.value,4);
  assert.equal(catalog.posts[5].dimensions.diameterIn,undefined);
  assert.deepEqual(catalog.posts[6].provides,[]);

  assert.deepEqual(catalog.finials.map(f=>[f.sku,f.artwork]),[
    [null,null],['3B','finial.ball'],['4SB','finial.ball'],['3DB','finial.deco-ball'],
    ['4DB','finial.deco-ball'],['SF4B','finial.deco-ball'],['3A','finial.acorn'],
    ['3DP','finial.pineapple'],['4DP','finial.pineapple'],['SF4P','finial.pineapple'],
    ['3DC','finial.dome-cap']
  ]);
  assert.deepEqual(Object.fromEntries(catalog.finials.filter(f=>f.sku).map(f=>[f.sku,f.compatible])),{
    '3B':['AA-POST-ROUND-3-SMOOTH','AA-POST-ROUND-3-FLUTED'],
    '4SB':['AA-POST-SQUARE-4'],
    '3DB':['AA-POST-ROUND-3-SMOOTH','AA-POST-ROUND-3-FLUTED'],
    '4DB':['AA-POST-ROUND-4-SMOOTH','AA-POST-ROUND-4-FLUTED'],
    'SF4B':['AA-POST-SQUARE-4'],
    '3A':['AA-POST-ROUND-3-SMOOTH','AA-POST-ROUND-3-FLUTED'],
    '3DP':['AA-POST-ROUND-3-SMOOTH','AA-POST-ROUND-3-FLUTED'],
    '4DP':['AA-POST-ROUND-4-SMOOTH','AA-POST-ROUND-4-FLUTED'],
    'SF4P':['AA-POST-SQUARE-4'],
    '3DC':['AA-POST-ROUND-3-SMOOTH','AA-POST-ROUND-3-FLUTED']
  });
  assert.deepEqual(catalog.frames,{
    'finial.acorn':{mateWidth:48,embedDepth:21},
    'finial.ball':{mateWidth:48,embedDepth:18},
    'finial.deco-ball':{mateWidth:50,embedDepth:17},
    'finial.dome-cap':{mateWidth:76,embedDepth:15},
    'finial.pineapple':{mateWidth:81,embedDepth:32.5}
  });
  assert.deepEqual(catalog.defaults,{post:'AA-POST-ROUND-238-SMOOTH',finial:'AA-FINIAL-3DC',length:'12'});
  assert.equal(catalog.spear,false);

  for(const row of catalog.compatibility) {
    const finial=catalog.finials.find(f=>f.id===row.finial);
    const uChannel=row.post==='AA-POST-UCHANNEL';
    if(!finial.sku) assert.deepEqual(row.issues,[]);
    else if(uChannel) assert.deepEqual(row.issues,[{severity:'error',code:'finial-post-incompatible'}]);
    else if(finial.compatible.includes(row.post)) assert.deepEqual(row.issues,[]);
    else assert.deepEqual(row.issues,[{severity:'info',code:'finial-post-unknown'}]);
  }

  await page.selectOption('#post','AA-POST-ROUND-3-FLUTED');
  await page.selectOption('#finial','AA-FINIAL-3B');
  const geometry=[];
  for(const length of ['10','13']) {
    await page.selectOption('#postLength',length);
    geometry.push(await page.evaluate(() => ({
      length:__proofDebug.lengthFt,
      top:[__proofDebug.postPxW,__proofDebug.matingY,__proofDebug.spineTop,__proofDebug.embedPx,__proofDebug.finialScale],
      posts:[...document.querySelectorAll('[data-part="post-lower"] path,[data-part="post-upper"] path')].map(p=>p.getAttribute('d')),
      breaks:[...document.querySelectorAll('[data-part="break"] path')].map(p=>p.getAttribute('d')),
      label:document.querySelector('#assembly > text:last-child')?.textContent.trim()
    })));
  }
  assert.equal(geometry[0].length,10);
  assert.equal(geometry[1].length,13);
  assert.deepEqual(geometry[0].top,geometry[1].top,'post length must not move mounted top geometry');
  assert.deepEqual(geometry[0].posts,geometry[1].posts,'post length must not alter the established broken-post silhouette');
  assert.deepEqual(geometry[0].breaks,geometry[1].breaks,'post length must not alter break geometry');
  assert.match(geometry[0].label,/10 ft post/);
  assert.match(geometry[1].label,/13 ft post/);

  const widths=[];
  for(const post of ['AA-POST-ROUND-3-SMOOTH','AA-POST-ROUND-4-SMOOTH','AA-POST-SQUARE-4']) {
    await page.selectOption('#post',post);
    await page.selectOption('#finial','AA-FINIAL-3B');
    widths.push(await page.evaluate(() => ({post:__proofDebug.postPxW,scale:__proofDebug.finialScale})));
  }
  assert.deepEqual(widths.map(x=>x.post),[15,20,20]);
  assert.ok(Math.abs(widths[1].scale/widths[0].scale-4/3)<1e-12);
  assert.equal(widths[1].scale,widths[2].scale,'4 in diameter and 4 in face width drive the same interface scale');

  const renderBoundary=await page.evaluate(() => {
    const assembly=$('assembly');
    const children=[...assembly.children].map(n=>n.getAttribute('data-part')).filter(Boolean);
    const basePaths=[...assembly.querySelectorAll('[data-part="post-lower"] > path,[data-part="post-upper"] > path')];
    const clipPaths=[...assembly.querySelectorAll('[data-part="post-artwork"] clipPath > path')];
    const refs=[...assembly.querySelectorAll('*')].flatMap(node=>[...node.attributes]
      .map(a=>a.value.match(/url\(#([^)]+)\)/)?.[1]).filter(Boolean));
    const forbidden=[...Object.values(ART).flatMap(a=>[a.id,a.provenance.assetId,a.provenance.assetFile]),
      ...DATA.posts.flatMap(p=>[p.id,...p.vendor.flatMap(v=>[v.name,v.sku])])].filter(Boolean);
    return {
      children,
      procedural:basePaths.map(p=>({d:p.getAttribute('d'),fill:p.getAttribute('fill')})),
      clips:clipPaths.map(p=>p.getAttribute('d')),
      hasDefs:!!assembly.querySelector('[data-part="post-artwork"] defs'),
      hasGradient:!!assembly.querySelector('[data-part="post-artwork"] linearGradient'),
      refsResolve:refs.every(id=>document.getElementById(id)),
      clean:forbidden.every(value=>!$('proof').outerHTML.includes(value))
    };
  });
  assert.deepEqual(renderBoundary.children.slice(0,4),['post-lower','post-upper','post-artwork','break']);
  assert.ok(renderBoundary.procedural.every(p=>p.fill==='#111' && p.d));
  assert.deepEqual(renderBoundary.clips,renderBoundary.procedural.map(p=>p.d));
  assert.ok(renderBoundary.hasDefs && renderBoundary.hasGradient && renderBoundary.refsResolve);
  assert.ok(renderBoundary.clean,'proof tree must not contain product, vendor, or source artwork identity');

  await page.screenshot({path:path.join(output,'phase2-fluted-square.png'),fullPage:true});
  console.log('Phase 2 checks: catalog mappings, compatibility, mount frames, length independence, interface scaling, render isolation, sanitization and standalone defs passed.');
};
