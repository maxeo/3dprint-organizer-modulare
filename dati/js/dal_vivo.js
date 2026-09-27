// Applicazione dal vivo: la geometria si calcola in un worker e la guida si aggiorna sul posto, senza ricaricare.
// Usa le variabili globali del template (DATA, byId, IDS, steps, A, SIZE, ...) e organizerRerender(),
// generata da integra_configuratore.js con le istruzioni del template per mappa, lista e passaggi.
(function(O){
"use strict";
let worker=null,seq=0,applySeq=0;const waiting=new Map();

// Worker creato dal testo di geometria.js, già nella pagina: nessun file esterno, funziona anche offline.
function getWorker(){
  if(worker!==null)return worker;
  try{const src=document.querySelector('script[data-modulo="geometria.js"]').textContent;
    const code=`self.window=self;\n${src}\nonmessage=e=>{const {id,c}=e.data;try{const G=self.OrganizerCfg;G.validate(c);const pre={};for(const p of G.partsForConfig(c)){pre[p.name]=G.previewTris(p);if(p.twin)pre[p.name+'·2']=G.previewTris(p.twin)}postMessage({id,pre})}catch(err){postMessage({id,error:err.message})}}`;
    worker=new Worker(URL.createObjectURL(new Blob([code],{type:'text/javascript'})));
    // se il worker non parte, le richieste in attesa ripiegano sul calcolo nella pagina
    worker.addEventListener('error',e=>{e.preventDefault();console.warn('Worker del configuratore non disponibile: calcolo nella pagina.',e.message);worker.terminate();worker=false;for(const r of waiting.values())r(null);waiting.clear()});
  }catch(e){console.warn('Worker del configuratore non disponibile: calcolo nella pagina.',e);worker=false}
  return worker}

// Anteprime dei pezzi ({nome: triangoli}); null se il worker manca (le calcola build() nella pagina).
function compute(c){const w=getWorker();if(!w)return Promise.resolve(null);
  return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{done();resolve(null)},20000);
    const done=()=>{clearTimeout(timer);waiting.delete(id);w.removeEventListener('message',on)};waiting.set(id,v=>{done();resolve(v)});
    const on=e=>{if(e.data.id!==id)return;done();e.data.error?reject(Error(e.data.error)):resolve(e.data.pre)};
    w.addEventListener('message',on);w.postMessage({id,c})})}

// Sostituisce il contenuto degli oggetti di DATA senza cambiarne l'identità: il template ne tiene riferimenti
// (steps, header, map, assembly/center...).
function morph(dst,src){
  if(Array.isArray(dst)){dst.length=0;dst.push(...src);return dst}
  for(const k of Object.keys(dst))if(!(k in src))delete dst[k];
  for(const k of Object.keys(src)){const a=dst[k],b=src[k];
    if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b))morph(a,b);else dst[k]=b}
  return dst}

function swap(data){
  morph(DATA,data);
  for(const k of Object.keys(byId))delete byId[k];
  for(const p of DATA.parts)byId[p.id]=p;
  IDS.length=0;IDS.push(...DATA.parts.map(p=>p.id));
  // normali come nel template
  for(const p of DATA.parts)if(p.kind==='mesh')p.normals=p.triangles.map(t=>{const a=p.vertices[t[0]],b=p.vertices[t[1]],c=p.vertices[t[2]];return norm(cross([b[0]-a[0],b[1]-a[1],b[2]-a[2]],[c[0]-a[0],c[1]-a[1],c[2]-a[2]]))});
  initCopies();
  A=DATA.assembly;CENTER=A.center;SIZE=A.size||100;DIST=SIZE*3.5;
  CAPTION0=DATA.caption||'Modello assemblato · orientamento di montaggio';
  totalQty=DATA.parts.reduce((s,p)=>s+p.quantity,0)+EXTRA.reduce((s,r)=>s+(r.quantity||1),0);
  const keepSel=selected&&byId[selected]?selected:null;
  organizerRerender();saveProgress();
  if(activeStep>=steps.length)activeStep=-1;
  if(activeStep>=0)step(activeStep);
  else{selected=keepSel;updateSelection();if(!explode)$('viewcaption').textContent=CAPTION0}
  if(selected)pick(selected);
  if(window.StampanteGuide)StampanteGuide.check();
  requestDraw()}

// Applica la configurazione c (null o standard = pezzi di stl/). Le richieste superate da una più recente
// vengono scartate: risolve false.
async function live(c){
  const token=++applySeq,custom=c&&!O.isStandard(c)?c:null;
  const pre=custom?await compute(custom):null;
  if(token!==applySeq)return false;
  swap(O.build(O.fresh(),custom,pre));
  return true}

O.live=live;
})(window.OrganizerCfg=window.OrganizerCfg||{});
