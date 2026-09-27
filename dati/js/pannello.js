// Pannello "Configura": pulsante fisso, campi con slider, pianta, applicazione e ZIP degli STL.
(function(O){
"use strict";
const $=id=>document.getElementById(id);
const fmt=v=>v.toLocaleString('it-IT',{maximumFractionDigits:2});
const round=O.round;
const PRESET_KEYS=['width_mm','depth_mm','tray_height_mm','clearance_above_mm'];
const PRESET_NAMES={standard:'Standard',mezzo:'Mezza larghezza',basso:'Basso',alto:'Alto',profondo:'Profondo',custom:'Personalizzata'};
// [chiave, etichetta, min, max, passo]
const SECTIONS=[
  ['Misure del modulo',[['width_mm','Larghezza esterna',105,1200,0.1],['depth_mm','Profondità esterna',125,1200,0.1],['tray_height_mm','Altezza cassetto',20,300,0.1],['clearance_above_mm','Luce sopra il cassetto',15,300,0.1],['levels','Livelli / copie',1,8,1]]],
  ['Scanalature modulari',[['groove_pitch_mm','Passo sedi',10,60,0.1],['groove_width_mm','Larghezza sede',2.5,6,0.1],['groove_depth_mm','Profondità sede',0.4,3,0.1],['divider_thickness_mm','Spessore divisorio',2,4,0.1]]],
  ['Giochi e struttura',[['wall_mm','Parete cassetto',2,8,0.1],['post_mm','Montante quadrato',16,40,0.1],['side_clearance_mm','Gioco laterale',0.2,2,0.05],['vertical_clearance_mm','Gioco verticale',0.2,2,0.05]]]];

const CSS=`
.cfg-panel,.cfg-panel *,.cfg-fab{box-sizing:border-box}
.cfg-fab{position:fixed;right:18px;bottom:18px;z-index:900;display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 18px;background:var(--accent);color:#fff;font:inherit;font-weight:800;box-shadow:0 10px 28px rgba(0,0,0,.28);cursor:pointer}
.cfg-fab small{font-weight:700;opacity:.85}.cfg-fab i{width:9px;height:9px;border-radius:50%;background:#ffd36b;display:none}.cfg-fab.custom i{display:inline-block}
.cfg-back{position:fixed;inset:0;background:rgba(15,12,14,.35);z-index:950;opacity:0;pointer-events:none;transition:opacity .18s}
.cfg-panel{position:fixed;top:16px;right:16px;bottom:16px;width:min(470px,calc(100vw - 32px));overflow-y:auto;overflow-x:hidden;z-index:1000;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 22px 60px rgba(35,31,25,.28);transform:translateX(calc(100% + 40px));transition:transform .2s ease;scrollbar-gutter:stable}
.cfg-open .cfg-panel{transform:none}.cfg-open .cfg-back{opacity:1;pointer-events:auto}
.cfg-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.cfg-head h2{margin:0;font-size:22px}.cfg-head p{margin:4px 0 0;color:var(--muted);font-size:13px}
.cfg-x{border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:10px;width:36px;height:36px;font-size:20px;cursor:pointer;flex:none}
.cfg-sec{font-size:11px;text-transform:uppercase;letter-spacing:.11em;color:var(--accent);font-weight:900;margin:16px 0 8px;padding-top:12px;border-top:1px solid var(--line)}
.cfg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.cfg-control{padding:9px 10px;background:var(--bg);border:1px solid var(--line);border-radius:12px;min-width:0}
.cfg-control.wide{grid-column:1/-1}
.cfg-control label{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px}
.cfg-name{font-size:11.5px;font-weight:800;color:var(--muted)}
.cfg-val{display:inline-flex;align-items:center;gap:3px}.cfg-val em{font-style:normal;font-size:11px;color:var(--muted);font-weight:700}
.cfg-val input{width:72px;height:28px;border:1px solid var(--line);border-radius:7px;padding:2px 6px;font:inherit;font-size:13px;font-weight:700;text-align:right;color:var(--ink);background:var(--card);font-variant-numeric:tabular-nums}
.cfg-control input[type=range]{width:100%;accent-color:var(--accent);margin:2px 0 0}
.cfg-control select{width:100%;height:34px;border:1px solid var(--line);border-radius:8px;padding:4px 8px;font:inherit;color:var(--ink);background:var(--card)}
.cfg-plan{margin-top:14px;border-radius:14px;background:var(--bg);border:1px solid var(--line);padding:8px}.cfg-plan svg{display:block;width:100%;height:auto;max-height:340px}
.cfg-facts{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.cfg-facts div{border:1px solid var(--line);border-radius:10px;padding:6px 8px}.cfg-facts b{display:block;font-size:15px;font-variant-numeric:tabular-nums}.cfg-facts span{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.cfg-actions{position:sticky;bottom:-18px;margin:14px -18px -18px;padding:12px 18px 16px;background:var(--card);border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:8px}
.cfg-actions button{border:0;border-radius:10px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer;background:var(--accent);color:#fff}.cfg-actions button.sec{background:transparent;color:var(--ink);border:1px solid var(--line)}.cfg-actions button:disabled{opacity:.5;cursor:not-allowed}
.cfg-status{flex-basis:100%;margin:0;font-size:12.5px;color:var(--muted);min-height:18px}.cfg-status.err{color:#b3412f;font-weight:700}.cfg-status.ok{color:var(--accent);font-weight:700}
@media(max-width:520px){.cfg-panel{top:0;right:0;bottom:0;width:100%;border-radius:0}.cfg-grid{grid-template-columns:1fr}.cfg-control.wide{grid-column:auto}.cfg-facts{grid-template-columns:repeat(2,1fr)}.cfg-fab{right:12px;bottom:12px}}
@media print{.cfg-fab,.cfg-panel,.cfg-back{display:none}}`;

function control([k,label,min,max,step],wide){return `<div class="cfg-control${wide?' wide':''}"><label for="cfg_${k}_n"><span class="cfg-name">${label}</span><span class="cfg-val"><input id="cfg_${k}_n" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}"><em>${k==='levels'?'':'mm'}</em></span></label><input id="cfg_${k}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}"></div>`}

function markup(){
  const sel=(id,label,opts)=>`<div class="cfg-control"><label for="${id}"><span class="cfg-name">${label}</span></label><select id="${id}">${opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div>`;
  return `<div class="cfg-back" id="cfg_back"></div><aside class="cfg-panel" id="cfg_panel" role="dialog" aria-modal="true" aria-labelledby="cfg_title">
<div class="cfg-head"><div><h2 id="cfg_title">Configura il modulo</h2><p>Quote in millimetri. <b>Applica</b> salva la configurazione e rigenera l’anteprima 3D con i pezzi calcolati qui.</p></div><button class="cfg-x" id="cfg_close" type="button" aria-label="Chiudi">×</button></div>
<div class="cfg-grid" style="margin-top:14px">${sel('cfg_preset','Tipologia iniziale',Object.entries(PRESET_NAMES))}${sel('cfg_divider_mode','Divisori',[['open','Nessuno'],['lane','Una corsia centrale'],['grid','Griglia con tre traversi']])}</div>
${SECTIONS.map(([title,fields])=>`<div class="cfg-sec">${title}</div><div class="cfg-grid">${fields.map((f,i)=>control(f,fields.length%2&&i===fields.length-1)).join('')}</div>`).join('')}
<div class="cfg-sec">Pianta</div><div class="cfg-plan" id="cfg_plan"></div>
<div class="cfg-facts"><div><b id="cfg_f_pitch"></b><span>passo mm</span></div><div><b id="cfg_f_tray"></b><span>cassetto mm</span></div><div><b id="cfg_f_grooves"></b><span>sedi per lato</span></div><div><b id="cfg_f_total"></b><span>telaio mm</span></div></div>
<div class="cfg-actions"><button id="cfg_apply" type="button">Applica all’anteprima</button><button id="cfg_zip" class="sec" type="button">Scarica ZIP STL</button><button id="cfg_std" class="sec" type="button">Torna allo standard</button><p class="cfg-status" id="cfg_status" role="status" aria-live="polite"></p></div>
</aside><button class="cfg-fab" id="cfg_fab" type="button" aria-controls="cfg_panel"><i></i>Configura<small id="cfg_fab_info"></small></button>`}

function readForm(){const c={preset:$('cfg_preset').value,divider_mode:$('cfg_divider_mode').value};for(const k of O.numeric)c[k]=Number($(`cfg_${k}_n`).value);return c}
function writeForm(c){$('cfg_preset').value=PRESET_NAMES[c.preset]?c.preset:'custom';$('cfg_divider_mode').value=c.divider_mode;for(const k of O.numeric){$(`cfg_${k}_n`).value=c[k];$(`cfg_${k}`).value=c[k]}}
function matchingPreset(c){return Object.keys(O.PRESETS).find(p=>O.PRESETS[p].every((v,i)=>c[PRESET_KEYS[i]]===v))||'custom'}
function status(text,cls=''){const s=$('cfg_status');s.textContent=text;s.className='cfg-status'+(cls?' '+cls:'')}

function planSvg(c){const w=c.width_mm,d=c.depth_mm,post=c.post_mm,tw=w-2*post-2*c.side_clearance_mm,td=d-post-8,wall=c.wall_mm,cy=-3,thick=c.divider_thickness_mm,xs=O.slots(tw-2*wall,c.groove_pitch_mm),ys=O.slots(td-2*wall,c.groove_pitch_mm),x0=-tw/2,y0=cy-td/2,r=n=>round(n,2);
  let svg=`<svg viewBox="${r(-w/2-16)} ${r(-d/2-30)} ${r(w+32)} ${r(d+62)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pianta di cassetto, telaio e scanalature"><rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" rx="3" fill="#e8e7db" stroke="#a9ad9f" stroke-width="2"/><rect x="${x0}" y="${y0}" width="${tw}" height="${td}" fill="#658f7b" stroke="#416a56" stroke-width="3"/><rect x="${x0+wall}" y="${y0+wall}" width="${tw-2*wall}" height="${td-2*wall}" fill="#d9e9d9"/>`;
  const gh=Math.min(30,(tw-2*wall)/2-8),gi=gh-4;svg+=`<path d="M ${r(-gh)} ${r(y0)} Q 0 ${r(y0-30)} ${r(gh)} ${r(y0)} L ${r(gi)} ${r(y0)} Q 0 ${r(y0-24)} ${r(-gi)} ${r(y0)} Z" fill="#658f7b" stroke="#365746" stroke-width="1.5"/>`;
  const line=(a,b,c2,d2)=>`<line x1="${a}" y1="${b}" x2="${c2}" y2="${d2}" stroke="#274436" stroke-width="${c.groove_width_mm}"/>`,g=c.groove_depth_mm+4;
  for(const x of xs)svg+=line(x,y0+wall,x,y0+wall+g)+line(x,y0+td-wall,x,y0+td-wall-g);
  for(const y of ys)svg+=line(x0+wall,cy+y,x0+wall+g,cy+y)+line(x0+tw-wall,cy+y,x0+tw-wall-g,cy+y);
  if(c.divider_mode!=='open'){svg+=`<rect x="${-thick/2}" y="${y0+wall}" width="${thick}" height="${td-2*wall}" fill="#b97058"/>`;if(c.divider_mode==='grid'){const t=(td-2*wall)/4;for(const y of new Set([-t,0,t].map(v=>ys.reduce((a,b)=>Math.abs(a-v)<Math.abs(b-v)?a:b))))svg+=`<rect x="${x0+wall}" y="${cy+y-thick/2}" width="${tw-2*wall}" height="${thick}" fill="#b97058"/>`}}
  for(const x of [-w/2,w/2-post])for(const y of [-d/2,d/2-post])svg+=`<rect x="${x}" y="${y}" width="${post}" height="${post}" fill="#d7cbb0" stroke="#958b77"/>`;
  // Il fronte (cassetto estraibile) è a y negativa: in pianta lo mostriamo in basso.
  return svg.replace('<rect','<g transform="scale(1,-1)"><rect')+`</g><text x="0" y="${r(d/2+22)}" text-anchor="middle" font-size="11" fill="#50665b">FRONTE / ESTRAZIONE ↓</text></svg>`}

function render(){let c;try{c=O.validate(readForm())}catch(e){status(e.message,'err');$('cfg_apply').disabled=$('cfg_zip').disabled=true;return}
  $('cfg_apply').disabled=$('cfg_zip').disabled=false;status(O.applied&&JSON.stringify(c)===JSON.stringify({...O.applied,preset:c.preset})?'Questa configurazione è già applicata all’anteprima.':'');
  const pitch=c.tray_height_mm+c.clearance_above_mm,tw=c.width_mm-2*c.post_mm-2*c.side_clearance_mm,td=c.depth_mm-c.post_mm-8;
  $('cfg_plan').innerHTML=planSvg(c);$('cfg_f_pitch').textContent=fmt(pitch);$('cfg_f_tray').textContent=`${fmt(round(tw))} × ${fmt(round(td))}`;
  $('cfg_f_grooves').textContent=`${O.slots(tw-2*c.wall_mm,c.groove_pitch_mm).length} + ${O.slots(td-2*c.wall_mm,c.groove_pitch_mm).length}`;$('cfg_f_total').textContent=fmt(pitch*c.levels);
  O.save(O.KEY_DRAFT,c)}

async function downloadZip(){let c;try{c=O.validate(readForm())}catch(e){status(e.message,'err');return}
  const b=$('cfg_zip');b.disabled=true;status('Calcolo STL in corso…');await new Promise(r=>setTimeout(r,25));
  try{const parts=O.partsForConfig(c),entries=[],enc=new TextEncoder(),manifest={generator:'Organizer JS offline',unit:'mm',configuration:c,note:'Un modulo geometrico preliminare con tenoni a L, sedi, longheroni con guida integrata e presa cava integrata; verificare con provini.',parts:[]};
    for(const p of parts){const stl=O.stlBytes(p.name,O.meshFromBoxes(p.adds,p.subs)),file=`stl/${p.id}_${p.name}.stl`;entries.push({name:file,data:stl.bytes});manifest.parts.push({id:p.id,name:p.name,group:p.group,file,copies:c.levels,assembled_bounds:stl.bounds,dimensions_mm:stl.dims,triangles:stl.triangles})}
    const readme=['ORGANIZER MODULARE - STL PRELIMINARI','',`Un modulo, da ripetere ${c.levels} volte. Le quote sono in millimetri.`,`Ingombro telaio: ${c.width_mm} x ${c.depth_mm} x ${c.tray_height_mm+c.clearance_above_mm} mm per livello.`,`Scanalature: passo ${c.groove_pitch_mm} mm, larghezza ${c.groove_width_mm} mm, profondita ${c.groove_depth_mm} mm.`,'','Tenoni 6 x 5 x 8 mm con dente a L di 1,5 mm: inserire il traverso sollevato e poi abbassarlo. Gioco nominale 0,35 mm per lato; longherone basso, guida e fermo sono un pezzo unico; presa cava integrata. Verificare piano di stampa, giochi, portata e montaggio con provini.',''].join('\n');
    entries.push({name:'manifest.json',data:enc.encode(JSON.stringify(manifest,null,2))},{name:'configurazione.json',data:enc.encode(JSON.stringify(c,null,2))},{name:'LEGGIMI.txt',data:enc.encode(readme)});
    const bytes=O.makeZip(entries),url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'})),a=document.createElement('a');
    a.href=url;a.download=`Organizer_${c.width_mm}x${c.depth_mm}_${c.divider_mode}_${c.levels}livelli.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    status(`ZIP creato: ${parts.length} STL per modulo, ${Math.round(bytes.length/1024)} KiB.`,'ok')}
  catch(e){status('Errore: '+e.message,'err');console.error(e)}finally{b.disabled=false}}

function apply(c){if(!O.save(O.KEY_APPLIED,c)){status('Il browser non consente di salvare le preferenze: impossibile applicare.','err');return}
  O.save(O.KEY_DRAFT,c);status('Rigenerazione dell’anteprima…','ok');history.replaceState(null,'',location.pathname+location.search);setTimeout(()=>location.reload(),60)}

function open(on){document.documentElement.classList.toggle('cfg-open',on);if(on){render();$('cfg_close').focus()}else $('cfg_fab').focus()}

function mount(){
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const host=document.createElement('div');host.innerHTML=markup();document.body.append(...host.childNodes);
  writeForm(O.load(O.KEY_DRAFT)||O.applied||O.STANDARD);
  const a=O.applied;$('cfg_fab').classList.toggle('custom',!!a);$('cfg_fab_info').textContent=a?`${fmt(a.width_mm)} × ${fmt(a.depth_mm)}`:'';
  $('cfg_fab').title=a?'Anteprima con configurazione personalizzata':'Anteprima dello standard';
  for(const k of O.numeric){const n=$(`cfg_${k}_n`),r=$(`cfg_${k}`);
    const sync=src=>{(src===n?r:n).value=src.value;if(PRESET_KEYS.includes(k))$('cfg_preset').value=matchingPreset(readForm());render()};
    n.addEventListener('input',()=>sync(n));r.addEventListener('input',()=>sync(r))}
  $('cfg_divider_mode').addEventListener('change',render);
  $('cfg_preset').addEventListener('change',()=>{const v=O.PRESETS[$('cfg_preset').value];if(v)PRESET_KEYS.forEach((k,i)=>{$(`cfg_${k}_n`).value=v[i];$(`cfg_${k}`).value=v[i]});render()});
  $('cfg_apply').addEventListener('click',()=>{try{apply(O.validate(readForm()))}catch(e){status(e.message,'err')}});
  $('cfg_zip').addEventListener('click',downloadZip);
  $('cfg_std').addEventListener('click',()=>{writeForm(O.STANDARD);O.save(O.KEY_DRAFT,null);if(O.applied)apply({...O.STANDARD});else render()});
  $('cfg_fab').addEventListener('click',()=>open(true));$('cfg_close').addEventListener('click',()=>open(false));$('cfg_back').addEventListener('click',()=>open(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.documentElement.classList.contains('cfg-open'))open(false)});
  // Link "#configura" nella pagina (e redirect da configuratore.html) aprono il pannello.
  const byHash=()=>{if(location.hash==='#configura'){open(true);history.replaceState(null,'',location.pathname+location.search)}};
  window.addEventListener('hashchange',byHash);byHash();
  render()}

O.openPanel=open;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})(window.OrganizerCfg=window.OrganizerCfg||{});
