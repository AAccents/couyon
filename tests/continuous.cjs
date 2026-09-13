const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
module.exports=async function(page,output,url){
  for(const [file,hash] of Object.entries(require('./artwork-path-hashes.json'))){
    const paths=[...fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/\r\n/g,'\n').matchAll(/\bd="([^"]*)"/g)].map(m=>m[1]);
    assert.equal(crypto.createHash('sha256').update(JSON.stringify(paths)).digest('hex'),hash,file+' path geometry immutable');
  }
  await page.goto(url);
  assert.equal(await page.locator('#proofView').inputValue(),'continuous');
  await page.locator('#proof').screenshot({path:path.join(output,'continuous-default.png')});
  await page.selectOption('#post','AA-POST-ROUND-3-FLUTED');
  await page.selectOption('#finial','AA-FINIAL-3B');
  await page.selectOption('#bracket','AA-BRACKET-DOGWOOD-30');
  await page.fill('#street1','Oak Ave');await page.fill('#street2','Pine St');
  const measure=()=>page.evaluate(()=>{
    const svg=$('proof'),d=__proofDebug;
    const matrix=n=>svg.getCTM().inverse().multiply(n.getCTM());
    const bounds=n=>{
      const b=n.getBBox(),m=matrix(n);
      const ps=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));
      return {x:Math.min(...ps.map(p=>p.x)),y:Math.min(...ps.map(p=>p.y)),w:Math.max(...ps.map(p=>p.x))-Math.min(...ps.map(p=>p.x)),h:Math.max(...ps.map(p=>p.y))-Math.min(...ps.map(p=>p.y))};
    };
    const part=p=>$('assembly').querySelector(`[data-part="${p}"]`);
    const a=matrix($('assembly'));
    const upper=bounds(part('post-upper')),lower=bounds(part('post-lower'));
    const detail=document.querySelector('[data-view="finial-detail"]');
    return {view:d.view,length:d.lengthFt,scale:d.pageScale,ratioX:a.a/0.2,ratioY:a.d/0.2,
      nominalHeight:lower.y+lower.h-upper.y,post:upper.w,
      blade:bounds(part('blade')),base:bounds(part('base')),model:d.model,
      assembly:bounds($('assembly')),sheet:bounds($('sheetComposition')),
      joint:Math.abs(d.spineTop+d.embedPx-d.matingY),
      contiguous:d.lowerSectionTopY===d.topSectionBottomY,
      ground:d.groundY,baseEnd:d.baseTopY+d.model.baseHeight*5,
      collar:d.mateRatio,detailScale:detail?matrix(detail).a:null,
      sameFinial:!detail || JSON.stringify([...detail.querySelectorAll('path')].map(n=>n.getAttribute('d')))===JSON.stringify([...part('finial').querySelectorAll('path')].map(n=>n.getAttribute('d'))),
      text:$('proof').textContent,blocked:d.integrity.blocked};
  });
  const samples=[];
  for(const length of ['10','11','12','13']){
    await page.selectOption('#postLength',length);const m=await measure();samples.push(m);
    assert.equal(m.view,'continuous');assert.equal(m.scale,3.6);
    assert.ok(Math.abs(m.ratioX-3.6)<1e-5 && Math.abs(m.ratioY-3.6)<1e-5,'one isotropic projection');
    assert.ok(Math.abs(m.nominalHeight-Number(length)*12*3.6)<1e-4);
    assert.ok(Math.abs(m.post/m.model.postWidth-3.6)<1e-4,'no width correction');
    assert.ok(Math.abs(m.blade.w/m.model.bladeWidth-3.6)<1e-4);
    assert.ok(Math.abs(m.blade.h/m.model.bladeHeight-3.6)<1e-4);
    assert.ok(Math.abs(m.base.h/m.model.baseHeight-3.6)<1e-4);
    assert.ok(m.joint<1e-5 && m.contiguous && m.ground===m.baseEnd && Math.abs(m.collar-1.1)<1e-5);
    assert.ok(Math.abs(m.detailScale-3.6)<1e-5);assert.ok(m.sameFinial);
    for(const b of [m.assembly,m.sheet]) assert.ok(b.x>=0 && b.y>=0 && b.x+b.w<=612 && b.y+b.h<=792,JSON.stringify(b));
    assert.match(m.text,/Concept Proof — Not for fabrication/);assert.match(m.text,/representative/);
    assert.equal(m.blocked,false);
    await page.locator('#proof').screenshot({path:path.join(output,`continuous-${length}ft.png`)});
  }
  for(let i=1;i<samples.length;i++)assert.ok(Math.abs(samples[i].nominalHeight-samples[i-1].nominalHeight-43.2)<1e-4);
  const matrix=await page.evaluate(()=>{
    const failures=[];let count=0;
    const bounds=n=>{
      const b=n.getBBox(),m=$('proof').getCTM().inverse().multiply(n.getCTM());
      return {x:b.x*m.a+m.e,y:b.y*m.d+m.f,w:b.width*m.a,h:b.height*m.d};
    };
    for(const p of DATA.posts)for(const f of DATA.finials)for(const b of DATA.bases){
      if(validateAssembly({post:p,finial:f,base:b}).some(x=>x.severity==='error'))continue;
      $('post').value=p.id;$('finial').value=f.id;$('base').value=b.id;
      $('postLength').value='13';update();count++;
      const d=__proofDebug;
      for(const part of ['assembly','sheetComposition']){
        const r=bounds($(part));
        if(r.x<0 || r.y<0 || r.x+r.w>612 || r.y+r.h>792)failures.push({p:p.id,f:f.id,b:b.id,part,r});
      }
      const m=$('proof').getCTM().inverse().multiply($('assembly').getCTM());
      if(Math.abs(d.postPxW*m.a/d.model.postWidth-3.6)>.0001)failures.push('width');
      if(d.model.knownBaseHeight){
        const base=bounds($('assembly').querySelector('[data-part="base"]'));
        if(Math.abs(base.h/d.model.knownBaseHeight-3.6)>.0001)failures.push('known base height');
      }
      if(d.integrity.blocked)failures.push({p:p.id,f:f.id,b:b.id,blocked:true});
    }
    return {count,failures};
  });
  assert.ok(matrix.count>200);assert.deepEqual(matrix.failures,[],'continuous catalog containment and width matrix');
  console.log(`Continuous catalog matrix: ${matrix.count} combinations passed.`);
  await page.selectOption('#post','AA-POST-ROUND-3-FLUTED');
  await page.selectOption('#finial','AA-FINIAL-3B');
  await page.selectOption('#base','AA-BASE-CORINTHIAN');
  await page.selectOption('#postLength','12');
  const knownReach=await page.evaluate(()=>{
    const bracket=selectedComponent('brackets'),saved=bracket.dimensions;
    SOURCES.continuousFixture='Synthetic test source';
    try{
      bracket.dimensions={reachIn:{value:18,confidence:'vendor-supported',source:'continuousFixture'}};update();
      const n=$('assembly').querySelector('[data-part="bracket"] > g');
      const m=$('proof').getCTM().inverse().multiply(n.getCTM());
      const ratio=BRACKET_GEOMETRY.physicalReachUnits[bracket.style]*m.a/18;
      bracket.dimensions.reachIn.value=100;update();
      return {ratio,oversizeBlocked:__proofDebug.integrity.blocked};
    }finally{bracket.dimensions=saved;delete SOURCES.continuousFixture;update();}
  });
  assert.ok(Math.abs(knownReach.ratio-3.6)<1e-4 && knownReach.oversizeBlocked);
  const download=page.waitForEvent('download');await page.click('#exportProof');
  const file=path.join(output,'continuous-proof.svg');await (await download).saveAs(file);
  const exported=fs.readFileSync(file,'utf8');
  assert.ok(!/AA-POST|AA-FINIAL|TCP-|Ornamental|assetFile/.test(exported));
  const exportValid=await page.evaluate(async source=>{
    const doc=new DOMParser().parseFromString(source,'image/svg+xml');
    const refs=[...doc.querySelectorAll('*')].flatMap(n=>[...n.attributes].flatMap(a=>[...a.value.matchAll(/url\(#([^)]+)\)/g)].map(m=>m[1])));
    const ids=[...doc.querySelectorAll('[id]')].map(n=>n.id);
    const img=new Image();img.src=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));
    try{await img.decode();return !doc.querySelector('parsererror') && ids.length===new Set(ids).size && refs.every(id=>ids.includes(id)) && img.naturalWidth>0;}finally{URL.revokeObjectURL(img.src);}
  },exported);assert.ok(exportValid,'standalone SVG decodes and resolves references');
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.controls').isVisible(),false);
  assert.equal(await page.locator('.summary').isVisible(),false);
  const printed=await page.locator('#proof').boundingBox();assert.ok(Math.abs(printed.width-816)<1 && Math.abs(printed.height-1056)<1);
  await page.pdf({path:path.join(output,'continuous-proof.pdf'),preferCSSPageSize:true,printBackground:true});
  await page.emulateMedia({media:'screen'});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'continuous mobile containment');
  await page.setViewportSize({width:1440,height:1100});
  await page.fill('#street1','W'.repeat(60));assert.equal(await page.evaluate(()=>exportSVG()),false);
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('.canvas').isVisible(),false);
  await page.emulateMedia({media:'screen'});
  console.log('Continuous checks: fixed scale, four lengths, isotropic dimensions, joints, path hashes, detail reuse, containment, disclosures, standalone SVG and print passed.');
};
