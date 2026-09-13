// Physical datums are inches. Legacy path emitters use five authoring units per
// inch; inchAssembly removes that unit convention BEFORE the page projection.
// This adapter preserves bracket and lettering geometry without editing paths.
const PROOF_FAMILY_SCALE = 20;
const PROOF_FINISH = { body:'#1a1d20', detail:'#777c80' };
function assemblyInches({post,base,blade,finial,bracket,config,noStreet1,noStreet2,lengthFt}) {
  const width=postWidthIn(post),height=lengthFt*12;
  const baseHeight=base.style==='none' ? 0 : proofDimension(base,'heightIn');
  const art=finial.artwork ? ART[finial.artwork] : null;
  const finialScale=art ? mountScale(art,width) : null;
  const spineTop=art ? -art.frame.embedDepth*finialScale : 0;
  // Nominal post length includes the portion buried inside the finial socket.
  const ground=height+spineTop;
  const stations=streetLayout({postX:0,postTopY:0,postPxW:width,
    bladePxW:proofDimension(blade,'widthIn'),bladePxH:proofDimension(blade,'heightIn'),
    pxPerIn:1,bracket,config,noStreet1,noStreet2});
  return Object.freeze({
    postLength:height,
    postWidth:width,
    baseHeight,
    datums:Object.freeze({mating:0,ground,baseTop:ground-baseHeight,spineTop}),
    finialScale,
    stations:Object.freeze(stations.map(Object.freeze)),
    bladeWidth:proofDimension(blade,'widthIn'),
    bladeHeight:proofDimension(blade,'heightIn'),
    // Do not promote representative geometry to verified physical dimensions.
    knownPostWidth:physicalValue(post,post.profile==='round' ? 'diameterIn' : post.profile==='square4' ? 'faceWidthIn' : 'widthIn'),
    knownBaseHeight:base.style==='none' ? 0 : physicalValue(base,'heightIn')
  });
}
function configureProjection(continuous,model) {
  document.body.dataset.view=continuous ? 'continuous' : 'broken';
  $('proof').setAttribute('viewBox',continuous ? '0 0 612 792' : '0 0 900 620');
  $('proof').setAttribute('width',continuous ? '8.5in' : '900');
  $('proof').setAttribute('height',continuous ? '11in' : '620');
  $('sheetBackground').setAttribute('width',continuous ? 612 : 900);
  $('sheetBackground').setAttribute('height',continuous ? 792 : 620);
  $('sheetBackground').setAttribute('fill',continuous ? '#fff' : '#f4f6f8');
  $('legacyQualification').setAttribute('display',continuous ? 'none' : 'inline');
  $('inchAssembly').setAttribute('transform',continuous ? 'scale(0.2)' : '');
  const pointsPerIn=72/PROOF_FAMILY_SCALE;
  $('projection').setAttribute('transform',continuous
    ? `translate(210 ${690-model.datums.ground*pointsPerIn}) scale(${pointsPerIn})` : '');
  $('projection').setAttribute('data-scale',continuous ? `1:${PROOF_FAMILY_SCALE}` : 'working');
  $('sheetComposition').replaceChildren();
}
function proofText(x,y,text,size=9,fill='#535b63',weight=400) {
  return `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" fill="${fill}" font-weight="${weight}">${esc(text)}</text>`;
}
function checkSheetContainment(integrity) {
  if(document.body.dataset.view!=='continuous') return;
  const node=$('assembly'),b=node.getBBox();
  const m=$('proof').getCTM().inverse().multiply(node.getCTM());
  const box={x:b.x*m.a+m.e,y:b.y*m.d+m.f,w:b.width*m.a,h:b.height*m.d};
  // Reserve the adjacent column and header/footer; never auto-fit physical parts.
  if(box.x<36 || box.y<86 || box.x+box.w>350 || box.y+box.h>691) {
    integrity.blocked=true;
    document.body.dataset.proofBlocked='true';
    $('printProof').disabled=$('exportProof').disabled=true;
    for(const id of ['letteringStatus','sumLettering']){
      $(id).textContent+='\nAssembly exceeds the fixed-scale proof area; review required.';
      $(id).classList.add('conflict');
    }
  }
}
function treatment(root,detail=false) {
  if(!root) return;
  // Output finish only. Do not touch d, geometry, mount frames or dimensions.
  for(const node of root.querySelectorAll('[fill],[stroke]')) {
    const fill=node.getAttribute('fill');
    if (/^#(?:111|0b0b0b|1a1a1a|111111|171717|181818|161616|222|222222)$/i.test(fill||''))
      node.setAttribute('fill','url(#proof-finish)');
    const stroke=node.getAttribute('stroke');
    if(stroke && /^#(?:[3456789][0-9a-f]){3}$|^#[3456789]{3}$/i.test(stroke)) {
      node.setAttribute('stroke',PROOF_FINISH.detail);
      node.setAttribute('stroke-width',detail ? '.45' : '.3');
      node.setAttribute('vector-effect','non-scaling-stroke');
    }
  }
  // vector-effect is not inherited: assign the print stroke to actual shapes.
  for(const node of root.querySelectorAll('path,line,ellipse,rect')) {
    const stroke=getComputedStyle(node).stroke;
    const rgb=stroke.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
    if(rgb && +rgb[1]>=45 && +rgb[1]<=160 && Math.max(...rgb.slice(1).map(Number))-Math.min(...rgb.slice(1).map(Number))<16){
      node.setAttribute('stroke',PROOF_FINISH.detail);
      node.setAttribute('stroke-width',detail ? '.45' : '.3');
      node.setAttribute('vector-effect','non-scaling-stroke');
    }
  }
}
function composeProofSheet({continuous,model,finial,post,base,blade,bracket,lengthFt}) {
  if(!continuous) return;
  $('sheetComposition').innerHTML=`<defs><linearGradient id="proof-finish" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#111416"/><stop offset=".28" stop-color="#282c2f"/>
    <stop offset=".43" stop-color="#41464a"/><stop offset=".57" stop-color="#292d30"/>
    <stop offset="1" stop-color="#111416"/></linearGradient></defs>`;
  for(const part of ['post-lower','post-upper','post-artwork','finial','base'])
    treatment($('assembly').querySelector(`[data-part="${part}"]`));
  const shortTitle=($('job').value || 'Street Name System');
  // Sheet copy wraps; it never modifies the lettering on a product.
  const lines=(text,width=29)=>{
    const out=[]; let line='';
    for(const word of text.split(/\s+/)) {
      if((line+' '+word).trim().length>width && line){out.push(line);line='';}
      // Arbitrarily long input remains bounded without changing product text.
      for(let i=0;i<word.length;i+=width){
        const chunk=word.slice(i,i+width);
        if(i){out.push(line);line=chunk;}else line+=(line?' ':'')+chunk;
      }
    }
    if(line)out.push(line);return out;
  };
  let markup=proofText(36,34,'ALUMINUM ACCENTS',11,'#1a1d20',700)
    +proofText(476,34,'DESIGN APPROVAL',7,'#535b63',700)
    +`<line x1="36" y1="46" x2="576" y2="46" stroke="#c8cdd1" stroke-width=".6"/>`;
  const titleLines=lines(shortTitle,65);
  markup+=titleLines.slice(0,2).map((t,i)=>proofText(36,66+i*13,t,12,'#1a1d20',700)).join('');
  markup+=proofText(36,718,'01  /  CONTINUOUS ELEVATION',8,'#1a1d20',700)
    +proofText(36,731,'Scale 1:20 at actual size · Letter 8½ × 11 in',8)
    +proofText(36,744,'Street faces opened for name approval; spread view.',8)
    +`<line x1="36" y1="758" x2="576" y2="758" stroke="#c8cdd1" stroke-width=".6"/>`
    +proofText(36,776,'Concept Proof — Not for fabrication',9,'#1a1d20',700)
    +proofText(511,776,'AA  /  01',8);
  markup+=`<line x1="175" y1="690" x2="245" y2="690" stroke="#9aa1a7" stroke-width=".5"/>`;
  let y=421;
  markup+=proofText(370,396,'SELECTED COMPONENTS',8,'#1a1d20',700);
  const selected=[['POST',`${customerSummary(post.customer)} · ${lengthFt} ft`],
    ['FINIAL',customerSummary(finial.customer)],['BASE',customerSummary(base.customer)]];
  if(!$('noStreet1').checked || !$('noStreet2').checked)
    selected.push(['BLADE',customerSummary(blade.customer)],['BRACKET',customerSummary(bracket.customer)]);
  for(const [label,value] of selected) {
    markup+=proofText(370,y,label,6.5,'#68717a',700);y+=13;
    for(const line of lines(value,33)){markup+=proofText(370,y,line,9,'#1a1d20');y+=12;}
    y+=13;
  }
  markup+=proofText(370,674,'Component artwork is representative.',8)
    +proofText(370,686,'Confirm selected components and fit',8)
    +proofText(370,698,'before ordering. Colors are representative.',8);
  $('sheetComposition').insertAdjacentHTML('beforeend',markup);
  const source=$('assembly').querySelector('[data-part="finial"]');
  if(source.children.length) {
    const ns='http://www.w3.org/2000/svg';
    const detail=document.createElementNS(ns,'g');
    detail.setAttribute('data-view','finial-detail');
    detail.setAttribute('data-scale','1:4');
    // Same mounted source geometry, in the same five-units/inch convention.
    detail.setAttribute('transform','translate(450 335) scale(3.6)');
    const copy=source.cloneNode(true);
    for(const n of [copy,...copy.querySelectorAll('*')]) n.removeAttribute('data-part');
    // Finial source currently contains no IDs; namespace defensively for reuse.
    const ids=new Map([...copy.querySelectorAll('[id]')].map(n=>[n.id,'detail-'+n.id]));
    for(const n of [copy,...copy.querySelectorAll('*')]) for(const a of [...n.attributes]) {
      let value=a.value;
      for(const [id,next] of ids){if(a.name==='id' && value===id)value=next;else value=value.replaceAll(`url(#${id})`,`url(#${next})`).replace(new RegExp(`^#${id}$`),`#${next}`);}
      n.setAttribute(a.name,value);
    }
    detail.append(copy);$('sheetComposition').append(detail);treatment(copy,true);
    $('sheetComposition').insertAdjacentHTML('beforeend',proofText(370,359,'02  /  FINIAL DETAIL',8,'#1a1d20',700)+proofText(370,372,'Scale 1:4 · Same component, enlarged',8));
  }
  const data=JSON.parse($('proofIntegrity').textContent);
  data.presentation={view:'Continuous elevation; street faces opened for approval',scale:'1:20',sheet:'Letter, actual size',detail:source.children.length ? 'Finial 1:4' : null};
  $('proofIntegrity').textContent=JSON.stringify(data);
  $('proofDescription').textContent+='\nComponent artwork is representative. Confirm selected components and fit before ordering. Continuous elevation 1:20 at actual Letter size.';
}
