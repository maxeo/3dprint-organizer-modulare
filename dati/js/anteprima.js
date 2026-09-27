// Anteprima configurata: se nelle preferenze c'è una configurazione applicata,
// sostituisce i pezzi standard della guida con quelli generati nel browser.
(function(O){
"use strict";
const KEY_DRAFT='organizer-config',KEY_APPLIED='organizer-config-applicata';
const STANDARD={preset:'standard',divider_mode:'lane',width_mm:320,depth_mm:340,tray_height_mm:48,clearance_above_mm:58,levels:3,groove_pitch_mm:20,groove_width_mm:3,groove_depth_mm:1,divider_thickness_mm:2.4,wall_mm:3.2,post_mm:22,side_clearance_mm:0.5,vertical_clearance_mm:0.4};

function load(key){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?{...STANDARD,...v}:null}catch(_){return null}}
function save(key,c){try{c?localStorage.setItem(key,JSON.stringify(c)):localStorage.removeItem(key);return true}catch(_){return false}}
const isStandard=c=>Object.keys(STANDARD).every(k=>k==='preset'||c[k]===STANDARD[k]);
const fmt=v=>v.toLocaleString('it-IT',{maximumFractionDigits:2});
const nameOf=p=>p.file.replace(/^.*\/P\d+_/,'').replace(/\.stl$/,'');
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));

// Vertici condivisi e box, nel formato mesh della guida.
function indexed(tris){const map=new Map(),vertices=[],triangles=[];const at=v=>{const r=v.map(x=>Math.round(x*100)/100),k=r.join();let i=map.get(k);if(i===undefined){i=vertices.length;map.set(k,i);vertices.push(r)}return i};
  for(const t of tris)triangles.push(t.map(at));
  const box=[0,1,2].map(i=>Math.min(...vertices.map(v=>v[i]))).concat([0,1,2].map(i=>Math.max(...vertices.map(v=>v[i]))));
  return {vertices,triangles,box}}

function labelFor(name){const m=name.match(/^Divisorio_trasversale_(\d+)$/);return m?`Divisorio trasversale ${m[1]}`:name.replace(/_L1$/,'').replace(/_/g,' ')}

function patch(data){
  const c=load(KEY_APPLIED);O.applied=null;O.standardData=data;
  if(!c||isStandard(c))return data;
  let generated;try{O.validate(c);generated=O.partsForConfig(c)}catch(e){console.warn('Configurazione non valida, uso lo standard',e);return data}
  const groups=data.groups||{},byName={},oldName={};
  for(const p of data.parts){byName[nameOf(p)]=p;oldName[p.id]=nameOf(p)}
  const parts=generated.map(g=>{const ref=byName[g.name],geo=indexed(O.previewMesh(g.adds,g.subs)),css=ref?ref.css_color:(groups[g.group]||{}).color||'#b97058';
    return {kind:'mesh',...geo,id:g.id,label:ref?ref.label:labelFor(g.name),group:g.group,file:`stl/${g.id}_${g.name}.stl`,quantity:c.levels,color:ref?ref.color:hexRgb(css),css_color:css,print:ref?ref.print:'divisori',note_html:'',dims:[0,1,2].map(i=>Math.round((geo.box[i+3]-geo.box[i])*100)/100)}});
  const newId=Object.fromEntries(generated.map(g=>[g.name,g.id]));
  const extra=generated.filter(g=>!byName[g.name]).map(g=>g.id);
  const divider=newId.Divisorio_longitudinale;
  const remap=ids=>{const out=(ids||[]).map(id=>newId[oldName[id]]).filter(Boolean);if(divider&&out.includes(divider))out.push(...extra);return out};
  const all=parts.map(p=>p.id);
  data.steps=(data.steps||[]).map(s=>{const r={...s,parts:remap(s.parts),built:s.built&&remap(s.built)};if(s.moving)r.moving=remap(s.moving);
    if((s.parts||[]).length===data.parts.length)r.parts=all;return r}).filter((s,i)=>s.parts.length||!(data.steps[i].parts||[]).length);
  if(data.map)for(const card of data.map.cards||[])if(card.ids)card.ids=all.filter(id=>remap(card.ids).includes(id)||extra.includes(id));
  data.parts=parts;
  // Ingombro e direzioni dell'esploso come in build_guide.py.
  const box=[0,1,2].map(i=>Math.min(...parts.map(p=>p.box[i]))).concat([3,4,5].map(i=>Math.max(...parts.map(p=>p.box[i]))));
  const center=[0,1,2].map(i=>(box[i]+box[i+3])/2),size=Math.max(box[3]-box[0],box[4]-box[1],box[5]-box[2]),dist=Math.round(size*.8)/10;
  data.assembly={box,center,size};data.spread={};
  for(const p of parts){const v=[0,1,2].map(i=>(p.box[i]+p.box[i+3])/2-center[i]),L=Math.hypot(...v);data.spread[p.id]=L>1e-6?v.map(x=>Math.round(x/L*dist*100)/100):[0,0,0]}
  const pitch=c.tray_height_mm+c.clearance_above_mm,wall=c.wall_mm,tw=c.width_mm-2*c.post_mm-2*c.side_clearance_mm,td=c.depth_mm-c.post_mm-8;
  const xs=O.slots(tw-2*wall,c.groove_pitch_mm),ys=O.slots(td-2*wall,c.groove_pitch_mm);
  const facts=(data.header||{}).facts||[],set=(i,v)=>{if(facts[i])facts[i].value=v};
  set(0,`${fmt(c.width_mm)} × ${fmt(c.depth_mm)} mm`);set(1,`${fmt(pitch)} mm`);set(2,`${xs.length} + ${ys.length}`);set(3,`${parts.length} STL`);
  if(data.header)data.header.eyebrow='Configurazione personalizzata · anteprima generata nel browser';
  data.caption=`Anteprima della configurazione ${fmt(c.width_mm)} × ${fmt(c.depth_mm)} mm, ${c.levels} livelli: pezzi calcolati nel browser, gli stessi del pacchetto STL.`;
  data.model_note_html=`<span class="badge">Configurazione personalizzata</span><p>Modulo ${fmt(c.width_mm)} × ${fmt(c.depth_mm)} × ${fmt(pitch)} mm, cassetto ${fmt(tw)} × ${fmt(td)} mm. Vista e lista pezzi usano la geometria generata nel browser; scarica gli STL da <b>Configura</b>. I testi con le quote si riferiscono ancora allo standard.</p>`;
  O.applied=c;
  return data;
}

Object.assign(O,{KEY_DRAFT,KEY_APPLIED,STANDARD,load,save,isStandard,patch});
})(window.OrganizerCfg=window.OrganizerCfg||{});
