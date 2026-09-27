// Anteprima configurata: se nelle preferenze c'è una configurazione applicata,
// sostituisce i pezzi standard della guida con quelli generati nel browser.
(function(O){
"use strict";
const KEY_DRAFT='organizer-config',KEY_APPLIED='organizer-config-applicata',KEY_LEVELS='organizer-mostra-livelli';
const STANDARD={preset:'standard',divider_mode:'modulare',dividers_long:1,dividers_cross:0,width_mm:250,depth_mm:240,tray_height_mm:48,clearance_above_mm:58,levels:3,groove_pitch_mm:20,groove_width_mm:3,groove_depth_mm:1,divider_thickness_mm:2.4,wall_mm:3.2,post_mm:22,side_clearance_mm:0.5,vertical_clearance_mm:0.4,wheels:4};

function load(key){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?{...STANDARD,...v}:null}catch(_){return null}}
function save(key,c){try{c?localStorage.setItem(key,JSON.stringify(c)):localStorage.removeItem(key);return true}catch(_){return false}}
const isStandard=c=>O.dividerKey(c)===O.dividerKey(STANDARD)&&Object.keys(STANDARD).every(k=>k==='preset'||k.startsWith('divider')||(k==='wheels'?O.wheelCount(c)===STANDARD.wheels:c[k]===STANDARD[k]));
const fmt=v=>v.toLocaleString('it-IT',{maximumFractionDigits:2});
const nameOf=p=>p.file.replace(/^.*\/[A-Z]\d+_/,'').replace(/\.stl$/,'');
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));

// Vertici condivisi e box, nel formato mesh della guida.
function indexed(tris){const map=new Map(),vertices=[],triangles=[];const at=v=>{const r=v.map(x=>Math.round(x*100)/100),k=r.join();let i=map.get(k);if(i===undefined){i=vertices.length;map.set(k,i);vertices.push(r)}return i};
  for(const t of tris)triangles.push(t.map(at));
  const box=[0,1,2].map(i=>Math.min(...vertices.map(v=>v[i]))).concat([0,1,2].map(i=>Math.max(...vertices.map(v=>v[i]))));
  return {vertices,triangles,box}}

const wheelText=n=>`Prima monta le ${n} ruote: infila ogni ruota nella sua sede sotto il cassetto e spingi il perno Ø3,42 dall’esterno della sponda fino a filo; il perno resta bloccato dalla guida quando il cassetto è dentro. `;
const WHEEL_TEXT_RE=/^Prima monta le \d+ ruote:.*?quando il cassetto è dentro\. /;
function labelFor(name){if(name==='Ruota_cassetto')return 'Ruota del cassetto';if(name==='Perno_ruota')return 'Perno della ruota';const m=name.match(/^Divisorio_trasversale_(\d+)$/);return m?`Divisorio trasversale ${m[1]}`:name.replace(/_L1$/,'').replace(/_/g,' ')}

// Ingombro e direzioni dell'esploso come in build_guide.py.
function layout(data){const parts=data.parts.concat(data.copies||[]);
  const box=[0,1,2].map(i=>Math.min(...parts.map(p=>p.box[i]))).concat([3,4,5].map(i=>Math.max(...parts.map(p=>p.box[i]))));
  const center=[0,1,2].map(i=>(box[i]+box[i+3])/2),size=Math.max(box[3]-box[0],box[4]-box[1],box[5]-box[2]),dist=Math.round(size*.8)/10;
  data.assembly={box,center,size};data.spread={};
  for(const p of parts){const v=[0,1,2].map(i=>(p.box[i]+p.box[i+3])/2-center[i]),L=Math.hypot(...v);data.spread[p.id]=L>1e-6?v.map(x=>Math.round(x/L*dist*100)/100):[0,0,0]}}
// "Mostra più livelli": le copie dei livelli superiori sono pezzi fantasma solo per la vista
// (id T03·L2): fuori da lista e quantità, un clic seleziona il pezzo principale.
function stack(data,c){const n=c.levels,pitch=c.tray_height_mm+c.clearance_above_mm,byId=Object.fromEntries(data.parts.map(p=>[p.id,p]));
  // copie dello spec (solo spostamento) o calcolate a parte (vertici propri)
  const views=data.parts.filter(p=>p.kind==='mesh').concat((data.copies||[]).filter(q=>!q.ghost).map(q=>{const m=byId[q.main],o=q.offset;
    return q.vertices?q:{...q,vertices:m.vertices.map(v=>[v[0]+o[0],v[1]+o[1],v[2]+o[2]]),triangles:m.triangles,box:m.box.map((v,i)=>v+o[i%3])}}));
  for(let l=1;l<n;l++)for(const p of views){const dz=l*pitch,m=byId[p.main||p.id];
    const g={kind:'mesh',ghost:true,main:m.id,id:`${p.id}·L${l+1}`,label:m.label,group:m.group,color:m.color,css_color:m.css_color,quantity:0,
      vertices:p.vertices.map(q=>[q[0],q[1],Math.round((q[2]+dz)*100)/100]),triangles:p.triangles,box:p.box.map((v,i)=>i===2||i===5?v+dz:v)};
    O.ghosts.push(g)}
  data.copies=(data.copies||[]).concat(O.ghosts);
  data.caption=(data.caption||'')+` Vista con ${n} livelli impilati: le copie superiori sono solo di riferimento.`}
// Al caricamento: copia intatta dei dati standard (per rigenerare senza ricaricare) e configurazione salvata.
function patch(data){
  O.pristine=JSON.parse(JSON.stringify(data));
  try{O.showLevels=localStorage.getItem(KEY_LEVELS)==='1'}catch(_){O.showLevels=false}
  return build(data,load(KEY_APPLIED))}
// Dati della guida per la configurazione c (null = standard) e la vista a più livelli. pre: anteprime già
// calcolate dal worker ({nome pezzo: triangoli}). Imposta O.applied e O.ghosts.
function build(data,c,pre){
  O.applied=null;O.ghosts=[];
  const custom=c&&!isStandard(c)?customize(data,c,pre):null,shown=custom||STANDARD;
  if(O.showLevels&&shown.levels>1)stack(data,shown);
  if(custom||(O.showLevels&&shown.levels>1))layout(data);
  return data}
const fresh=()=>JSON.parse(JSON.stringify(O.pristine));

function customize(data,c,pre){
  if(!c||isStandard(c))return null;
  let generated;try{O.validate(c);generated=O.partsForConfig(c)}catch(e){console.warn('Configurazione non valida, uso lo standard',e);return null}
  const groups=data.groups||{},byName={},oldName={};
  for(const p of data.parts){byName[nameOf(p)]=p;oldName[p.id]=nameOf(p)}
  // ruote e perni: gruppo proprio, 4 per cassetto (nella vista compaiono tutti e quattro)
  if(O.wheelCount(c)&&!groups.Ruote){groups.Ruote={color:'#d9a441'};data.groups=groups}
  const parts=generated.map(g=>{const ref=byName[g.name],geo=indexed(pre&&pre[g.name]||O.previewTris(g)),css=ref?ref.css_color:(groups[g.group]||{}).color||'#b97058';
    return {kind:'mesh',...geo,id:g.id,label:ref?ref.label:labelFor(g.name),group:g.group,file:`stl/${g.id}_${g.name}.stl`,quantity:c.levels*(g.count||1),color:ref?ref.color:hexRgb(css),css_color:css,print:ref?ref.print:'divisori',note_html:'',dims:O.partDims(g)}});
  const newId=Object.fromEntries(generated.map(g=>[g.name,g.id]));
  data.copies=generated.filter(g=>g.twin).map(g=>({...indexed(pre&&pre[g.name+'·2']||O.previewTris(g.twin)),kind:'mesh',id:`${g.id}·2`,main:g.id}));
  // sigle dello standard -> sigle generate. "Txx·2" è la seconda copia di un gemello: resta copia se i gemelli sono uniti,
  // altrimenti diventa il pezzo separato; il nome comune di un gemello non unito va alla prima copia.
  const twinA={},twinB={};for(const [a,b,n] of O.TWINS||[]){twinA[n]=a;twinB[n]=b}
  const idOfName=n=>newId[n]||newId[twinA[n]];
  const mapId=id=>{const m=String(id).match(/^(.*)·(\d+)$/);if(!m)return idOfName(oldName[id]);const n=oldName[m[1]],g=generated.find(q=>q.name===n);
    return g&&g.twin?`${g.id}·2`:newId[twinB[n]]||idOfName(n)};
  // pezzi nuovi: tutti i divisori vanno dove lo standard ha il divisorio longitudinale, ruote e perni con il cassetto
  const extra=generated.filter(g=>!byName[g.name]&&g.group!=='Ruote').map(g=>g.id),wheelIds=generated.filter(g=>g.group==='Ruote').map(g=>g.id);
  const dividerIds=generated.filter(g=>g.group==='Divisori').map(g=>g.id),drawer=newId.Cassetto_L1;
  const remap=ids=>{const old=(ids||[]).map(id=>oldName[String(id).replace(/·\d+$/,'')]),out=[...new Set((ids||[]).map(mapId).filter(Boolean))];const add=ids=>out.push(...ids.filter(id=>!out.includes(id)));
    if(old.includes('Divisorio_longitudinale'))add(dividerIds);if(out.some(id=>dividerIds.includes(id)))add(extra);if(drawer&&out.includes(drawer))add(wheelIds);return out};
  const all=parts.map(p=>p.id);
  data.steps=(data.steps||[]).map(s=>{const r={...s,parts:remap(s.parts),built:s.built&&remap(s.built)};if(s.moving)r.moving=remap(s.moving);
    if((s.parts||[]).length>=data.parts.length)r.parts=all.concat(data.copies.map(q=>q.id));return r}).filter((s,i)=>s.parts.length||!(data.steps[i].parts||[]).length);
  // frase delle ruote nel passaggio del cassetto: lo spec la ha per le 4 ruote dello standard
  const nw=O.wheelCount(c);for(const s of data.steps)if(s.moving&&s.moving.includes(drawer)&&s.parts.length<all.length)s.text=(nw?wheelText(nw):'')+(s.text||'').replace(WHEEL_TEXT_RE,'');
  if(data.map)for(const card of data.map.cards||[])if(card.ids)card.ids=all.filter(id=>remap(card.ids).includes(id)||extra.includes(id));
  data.parts=parts;
  const pitch=c.tray_height_mm+c.clearance_above_mm,wall=c.wall_mm,tw=c.width_mm-2*c.post_mm-2*c.side_clearance_mm,td=c.depth_mm-c.post_mm-8;
  const xs=O.slots(tw-2*wall,c.groove_pitch_mm),ys=O.slots(td-2*wall,c.groove_pitch_mm);
  const facts=(data.header||{}).facts||[],set=(i,v)=>{if(facts[i])facts[i].value=v};
  set(0,`${fmt(c.width_mm)} × ${fmt(c.depth_mm)} mm`);set(1,`${fmt(pitch)} mm`);set(2,`${xs.length} + ${ys.length}`);set(3,`${parts.length} STL`);
  if(data.header)data.header.eyebrow='Configurazione personalizzata · anteprima generata nel browser';
  data.caption=`Anteprima della configurazione ${fmt(c.width_mm)} × ${fmt(c.depth_mm)} mm, ${c.levels} livelli: pezzi calcolati nel browser, gli stessi del pacchetto STL.`;
  data.model_note_html=`<span class="badge">Configurazione personalizzata</span><p>Modulo ${fmt(c.width_mm)} × ${fmt(c.depth_mm)} × ${fmt(pitch)} mm, cassetto ${fmt(tw)} × ${fmt(td)} mm${O.wheelCount(c)?`, ${O.wheelCount(c)} ruote Ø10 su perno Ø3,42: la mensola della guida è 2 mm più bassa e il cassetto resta alla stessa quota`:', senza ruote'}. Vista e lista pezzi usano la geometria generata nel browser; scarica gli STL da <b>Configura</b>. I testi con le quote si riferiscono ancora allo standard.</p>`;
  O.applied=c;
  return c;
}

Object.assign(O,{KEY_DRAFT,KEY_APPLIED,KEY_LEVELS,STANDARD,load,save,isStandard,patch,build,fresh});
})(window.OrganizerCfg=window.OrganizerCfg||{});
