// Modale "Disegna i divisori": la pianta interna del cassetto con le sedi; si colorano i tratti fra due sedi vicine
// (clic o trascinamento, anche col dito). Dallo schema geometria.js ricava pezzi su misura con intagli solo agli incroci.
(function(O){
"use strict";
const $=id=>document.getElementById(id);
const CSS=`
.dv-back{position:fixed;inset:0;z-index:1100;background:rgba(15,12,14,.45);display:none;align-items:center;justify-content:center;padding:16px}
.dv-open .dv-back{display:flex}
.dv-box{box-sizing:border-box;width:min(760px,100%);max-height:100%;overflow:auto;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 22px 60px rgba(0,0,0,.35)}
.dv-box *{box-sizing:border-box}
.dv-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.dv-head h2{margin:0;font-size:21px}.dv-head p{margin:4px 0 0;color:var(--muted);font-size:13px;max-width:560px}
.dv-tools{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 8px}
.dv-tools button,.dv-foot button{border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:9px;padding:7px 11px;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
.dv-tools button:hover,.dv-foot button.sec:hover{background:var(--bg)}
.dv-tools input{width:52px;height:30px;border:1px solid var(--line);border-radius:7px;padding:2px 6px;font:inherit;font-weight:700;text-align:right;color:var(--ink);background:var(--card)}
.dv-tools label{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:800;color:var(--muted)}
.dv-plan{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:8px;touch-action:none;user-select:none;-webkit-user-select:none}
.dv-plan svg{display:block;width:100%;height:auto;max-height:min(58vh,560px)}
.dv-edge{stroke:transparent;cursor:pointer}.dv-edge:hover+.dv-seg:not(.on){stroke:var(--accent);opacity:.45}
.dv-seg{stroke:#9fb3a6;opacity:.6;pointer-events:none}.dv-seg.on{opacity:1}.dv-seg.on{stroke:#b97058;stroke-dasharray:none}
.dv-line{cursor:pointer;fill:var(--muted);font-weight:800}.dv-line:hover{fill:var(--accent)}
.dv-sum{margin:10px 0 0;font-size:13px;color:var(--muted);min-height:18px}.dv-sum b{color:var(--ink)}.dv-sum.err{color:#b3412f;font-weight:700}
.dv-foot{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:12px}
.dv-foot button.main{background:var(--accent);border-color:var(--accent);color:#fff}
@media(max-width:520px){.dv-back{padding:0}.dv-box{border-radius:0;height:100%;padding:14px}.dv-plan svg{max-height:62vh}}
@media print{.dv-back{display:none!important}}`;

let base=null,done=null,v=new Set(),h=new Set(),mounted=false;

function mount(){if(mounted)return;mounted=true;
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const d=document.createElement('div');d.className='dv-back';d.id='dv_back';
  d.innerHTML=`<div class="dv-box" role="dialog" aria-modal="true" aria-labelledby="dv_title">
<div class="dv-head"><div><h2 id="dv_title">Disegna i divisori</h2><p>Colora i tratti fra le sedi: clic per aggiungere o togliere, trascina lungo una sede per colorarne tanti. Un clic sul numero di una sede la riempie o la svuota tutta. I pezzi si generano su misura, con gli intagli solo dove si incrociano.</p></div>
<button class="cfg-x" id="dv_close" type="button" aria-label="Chiudi"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
<div class="dv-tools"><label>Longitudinali <input id="dv_long" type="number" min="0" step="1"></label><label>Trasversali <input id="dv_cross" type="number" min="0" step="1"></label><button id="dv_fill" type="button" title="Disegna i divisori modulari indicati, distribuiti sulle sedi">Disegna</button><button id="dv_clear" type="button">Svuota</button></div>
<div class="dv-plan" id="dv_plan"></div><p class="dv-sum" id="dv_sum" aria-live="polite"></p>
<div class="dv-foot"><button class="sec" id="dv_cancel" type="button">Annulla</button><button class="main" id="dv_ok" type="button">Usa questo schema</button></div></div>`;
  document.body.appendChild(d);
  $('dv_close').onclick=$('dv_cancel').onclick=()=>close(false);$('dv_ok').onclick=()=>close(true);
  d.addEventListener('click',e=>{if(e.target===d)close(false)});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.documentElement.classList.contains('dv-open')){e.stopPropagation();close(false)}},true);
  $('dv_clear').onclick=()=>{v.clear();h.clear();draw()};
  $('dv_fill').onclick=()=>seed({...base,divider_mode:'modulare',dividers_long:+$('dv_long').value||0,dividers_cross:+$('dv_cross').value||0});
  // trascinamento: il primo tratto decide se si colora o si cancella
  const plan=$('dv_plan');let paint=null;
  // tratto più vicino al punto (in mm): vicino agli incroci vince la sede più vicina, non l'ultima disegnata
  const at=(e,axis)=>{const svg=plan.querySelector('svg'),m=svg&&svg.getScreenCTM();if(!m)return null;
    const q=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()),x=q.x,y=-q.y,g=grid(),hit=Math.max(8,base.groove_pitch_mm*0.55)/2;
    const near=(lines,u,nodes,w,ax)=>{let best=null;lines.forEach((L,i)=>{const d=Math.abs(w-L),k=nodes.findIndex((n,j)=>j<nodes.length-1&&u>=n&&u<=nodes[j+1]);
      if(k>=0&&d<=hit&&(!best||d<best.d))best={d,key:`${ax}:${i}:${k}`}});return best};
    const a=near(g.xs,y,g.yn,x,'v'),b=near(g.ys,x,g.xn,y,'h');if(axis)return axis==="v"?a&&a.key:b&&b.key;return a&&(!b||a.d<=b.d)?a.key:b?b.key:null};
  const set=(key,on)=>{const [ax,rest]=[key[0],key.slice(2)],S=ax==='v'?v:h;if(on)S.add(rest);else S.delete(rest)};
  const has=key=>(key[0]==='v'?v:h).has(key.slice(2));
  plan.addEventListener('pointerdown',e=>{const t=e.target.closest('[data-line]');
    if(t){const [ax,i]=t.dataset.line.split(':'),n=ax==='v'?grid().yn.length-1:grid().xn.length-1,keys=[...Array(n).keys()].map(k=>`${ax}:${i}:${k}`),on=!keys.every(has);keys.forEach(k=>set(k,on));draw();return}
    const k=at(e);if(!k)return;e.preventDefault();paint=!has(k);dragAxis=k[0];last={clientX:e.clientX,clientY:e.clientY};set(k,paint);draw()});
  // i movimenti veloci saltano dei tratti: si campiona anche il percorso fra un evento e l'altro
  // durante il trascinamento si resta sulla direzione del primo tratto: vicino agli incroci non si colora la sede perpendicolare
  let last=null,dragAxis=null;
  plan.addEventListener('pointermove',e=>{if(paint===null)return;const p={clientX:e.clientX,clientY:e.clientY},a=last||p,n=Math.max(1,Math.ceil(Math.hypot(p.clientX-a.clientX,p.clientY-a.clientY)/4));last=p;
    let changed=false;for(let i=1;i<=n;i++){const k=at({clientX:a.clientX+(p.clientX-a.clientX)*i/n,clientY:a.clientY+(p.clientY-a.clientY)*i/n},dragAxis);if(k&&has(k)!==paint){set(k,paint);changed=true}}
    if(changed)draw()});
  const stop=()=>{paint=null;last=null};window.addEventListener('pointerup',stop);window.addEventListener('pointercancel',stop)}

const grid=()=>O.dividerGrid(base);
function seed(c){try{const L=O.layoutEdges(c);v=L.v;h=L.h;draw()}catch(e){sum(e.message,true)}}
function sum(t,err){const s=$('dv_sum');s.innerHTML=t;s.className='dv-sum'+(err?' err':'')}
const layout=()=>({v:[...v].sort(),h:[...h].sort()});

function draw(){const g=grid(),r=n=>Math.round(n*100)/100,W=g.tw-2*g.wall,D=g.td-2*g.wall,pad=16,sw=Math.max(2,base.groove_width_mm),hit=Math.max(8,base.groove_pitch_mm*0.55);
  // y verso l'alto = fondo: il fronte (y negativa) sta in basso come nella pianta del pannello
  let s=`<svg viewBox="${r(-W/2-pad-6)} ${r(-D/2-pad-4)} ${r(W+2*pad+12)} ${r(D+2*pad+22)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schema dei divisori">`;
  s+=`<rect x="${r(-W/2-g.wall)}" y="${r(-D/2-g.wall)}" width="${r(W+2*g.wall)}" height="${r(D+2*g.wall)}" rx="2" fill="#658f7b"/><rect x="${r(-W/2)}" y="${r(-D/2)}" width="${r(W)}" height="${r(D)}" fill="#e3eee3"/>`;
  const seg=(key,x1,y1,x2,y2)=>`<line class="dv-edge" data-e="${key}" x1="${r(x1)}" y1="${r(-y1)}" x2="${r(x2)}" y2="${r(-y2)}" stroke-width="${r(hit)}"/><line class="dv-seg${(key[0]==='v'?v:h).has(key.slice(2))?' on':''}" x1="${r(x1)}" y1="${r(-y1)}" x2="${r(x2)}" y2="${r(-y2)}" stroke-width="${r(sw)}" stroke-linecap="square"/>`;
  g.xs.forEach((x,i)=>{for(let k=0;k<g.yn.length-1;k++)s+=seg(`v:${i}:${k}`,x,g.yn[k],x,g.yn[k+1])});
  g.ys.forEach((y,j)=>{for(let k=0;k<g.xn.length-1;k++)s+=seg(`h:${j}:${k}`,g.xn[k],y,g.xn[k+1],y)});
  // numeri delle sedi: clic = riga intera
  g.xs.forEach((x,i)=>s+=`<text class="dv-line" data-line="v:${i}" x="${r(x)}" y="${r(-D/2-g.wall-5)}" text-anchor="middle" font-size="8">${i+1}</text>`);
  g.ys.forEach((y,j)=>s+=`<text class="dv-line" data-line="h:${j}" x="${r(-W/2-g.wall-4)}" y="${r(-y+3)}" text-anchor="end" font-size="8">${String.fromCharCode(65+j%26)}</text>`);
  s+=`<text x="0" y="${r(D/2+g.wall+14)}" text-anchor="middle" font-size="8" fill="#50665b">FRONTE ↓</text></svg>`;
  $('dv_plan').innerHTML=s;
  // riepilogo dei pezzi che verranno generati
  try{const runs=O.dividerRuns({...base,divider_mode:'disegno',divider_layout:layout()});
    if(!runs.length){sum('Nessun divisorio: il cassetto resta libero.');return}
    const kinds=new Set(runs.map(q=>`${q.axis}|${O.round(q.u1-q.u0,3)}|${q.cuts.map(u=>O.round(u-q.u0,3))}`)),cuts=runs.reduce((a,q)=>a+q.cuts.length,0)/2;
    const lv=base.levels||1;
    sum(`<b>${runs.length}</b> ${runs.length===1?'pezzo':'pezzi'} per cassetto (${kinds.size} ${kinds.size===1?'forma':'forme diverse'}), <b>${cuts}</b> ${cuts===1?'incrocio':'incroci'} a mezzo legno${lv>1?` · ${runs.length*lv} da stampare per ${lv} livelli`:''}.`)}
  catch(e){sum(e.message,true)}}

function close(ok){document.documentElement.classList.remove('dv-open');const cb=done;done=null;if(ok&&cb)cb(layout())}

// c: configurazione del pannello (misure e sedi); cb(layout) quando si conferma.
function openDividers(c,cb){mount();base=c;done=cb;
  const g=grid(),sp=O.dividerSpec(c);$('dv_long').max=g.xs.length;$('dv_cross').max=g.ys.length;
  $('dv_long').value=sp.mode==='modulare'?sp.long:0;$('dv_cross').value=sp.mode==='modulare'?sp.cross:0;
  if(sp.mode==='disegno'){const L=O.layoutEdges(c);v=L.v;h=L.h;draw()}else seed(c);
  document.documentElement.classList.add('dv-open');$('dv_ok').focus({preventScroll:true})}

O.openDividers=openDividers;
})(window.OrganizerCfg=window.OrganizerCfg||{});
