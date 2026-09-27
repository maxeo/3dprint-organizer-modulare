// Geometria parametrica del modulo: stesse quote dello script Blender (organizer_parametrico.py).
(function(O){
"use strict";
const PRESETS={standard:[320,340,48,58],mezzo:[160,340,48,58],basso:[320,340,30,40],alto:[320,340,80,70],profondo:[320,450,48,58]};
const numeric=['width_mm','depth_mm','tray_height_mm','clearance_above_mm','levels','groove_pitch_mm','groove_width_mm','groove_depth_mm','divider_thickness_mm','wall_mm','post_mm','side_clearance_mm','vertical_clearance_mm'];
const round=(v,n=2)=>Number(v.toFixed(n));
function validate(c){if(!Object.values(c).every(v=>typeof v!=='number'||Number.isFinite(v)))throw Error('Inserisci numeri validi in tutti i campi.');if(c.width_mm<=2*c.post_mm+60||c.depth_mm<=2*c.post_mm+80)throw Error('Larghezza o profondità insufficiente per telaio e cassetto.');if(c.tray_height_mm<20||c.clearance_above_mm<15||c.tray_height_mm+c.clearance_above_mm<65||c.wall_mm<2||c.wall_mm>=c.tray_height_mm/3)throw Error('Altezza, luce o passo insufficienti per le sedi del telaio.');if(!Number.isInteger(c.levels)||c.levels<1||c.levels>8)throw Error('I livelli devono essere tra 1 e 8.');if(c.groove_pitch_mm<10||c.groove_width_mm<=c.divider_thickness_mm||c.groove_depth_mm<0.4||c.groove_depth_mm>c.wall_mm-1.2)throw Error('Le scanalature non lasciano sufficiente materiale o gioco.');if(!['open','lane','grid'].includes(c.divider_mode))throw Error('Modalità divisori non valida.');return c}
function slots(span,pitch,margin=12){const n=Math.floor((span/2-margin)/pitch);return Array.from({length:2*n+1},(_,i)=>(i-n)*pitch)}
function box(x0,x1,y0,y1,z0,z1){return [x0,x1,y0,y1,z0,z1]}
function centered(cx,cy,cz,sx,sy,sz){return box(cx-sx/2,cx+sx/2,cy-sy/2,cy+sy/2,cz-sz/2,cz+sz/2)}
// Presa a mezza C a fette. Profondità quantizzate a GRIP_STEP: la griglia voxel è unica per tutto il pezzo
// e profondità tutte diverse la farebbero esplodere.
const GRIP_X=32,GRIP_Z=16,GRIP_STEP=0.5;
function gripBoxes(front,top,wall,tw,h){const adds=[],subs=[],countX=GRIP_X,countZ=GRIP_Z,half=Math.min(30,(tw-2*wall)/2-8),maxDrop=Math.min(22,h-5);const q=v=>Math.round(v/GRIP_STEP)*GRIP_STEP,depth=(t,s)=>q(0.5+t*(14*(1-s*s)+1.5*Math.sin(Math.PI*s)));for(let i=0;i<countX;i++){let x0=-half+2*half*i/countX,x1=-half+2*half*(i+1)/countX,x=(x0+x1)/2,t=Math.pow(Math.max(0,1-(x/half)**2),1.2),drop=5+(maxDrop-5)*t;for(let j=0;j<countZ;j++){let s0=j/countZ,s1=(j+1)/countZ,sm=(s0+s1)/2;adds.push(box(x0,x1,front-depth(t,sm),front+1.5,q(top+0.2-(drop+0.2)*s1),q(top+0.2-(drop+0.2)*s0)))}}const innerHalf=half-4;for(let i=0;i<countX;i++){let x0=-innerHalf+2*innerHalf*i/countX,x1=-innerHalf+2*innerHalf*(i+1)/countX,x=(x0+x1)/2,t=Math.pow(Math.max(0,1-(x/innerHalf)**2),1.2),drop=5+(maxDrop-5)*t;for(let j=0;j<countZ;j++){let v0=j/countZ,v1=(j+1)/countZ,vm=(v0+v1)/2,z=top+2-(drop-0.2)*vm,s=Math.max(0,Math.min(1,(top-z)/drop)),inner=Math.max(0.5,depth(t,s)-2);subs.push(box(x0,x1,q(front-inner),front+wall+2,q(top+2-(drop-0.2)*v1),q(top+2-(drop-0.2)*v0)))}}return {adds,subs}}
function part(name,group,adds,subs=[]){return {name,group,adds,subs}}
// Gancio a L: dente HOOK x HOOK_LEN in punta al tenone; sede alta 5,7+HOOK con tasca sul fondo.
const HOOK=1.5,HOOK_LEN=3,LOW_RAIL=12.5;
function mortiseL(axis,cx,cy,inward,z){const off=inward*(8.5/2-(HOOK_LEN+0.7)/2),pz=z-2.85-HOOK/2+0.05;return axis==='Y'?[centered(cx,cy,z+HOOK/2,6.7,8.5,5.7+HOOK),centered(cx,cy+off,pz,6.7,HOOK_LEN+0.7,HOOK+0.1)]:[centered(cx,cy,z+HOOK/2,8.5,6.7,5.7+HOOK),centered(cx+off,cy,pz,HOOK_LEN+0.7,6.7,HOOK+0.1)]}
function partsForConfig(c){validate(c);const p=[];const w=c.width_mm,d=c.depth_mm,post=c.post_mm,wall=c.wall_mm,h=c.tray_height_mm,pitch=h+c.clearance_above_mm,side=c.side_clearance_mm,vertical=c.vertical_clearance_mm,tw=w-2*post-2*side,td=d-post-8,cy=-3,rail=d-2*post,gh=Math.min(30,h-wall-4),floor=11+wall,gw=c.groove_width_mm,gd=c.groove_depth_mm,thick=c.divider_thickness_mm;const xs=slots(tw-2*wall,c.groove_pitch_mm),ys=slots(td-2*wall,c.groove_pitch_mm);
  for(const [sx,x] of [['S',-w/2+post/2],['D',w/2-post/2]])for(const [sy,y] of [['F',-d/2+post/2],['R',d/2-post/2]]){let jc=0.35,joint=8,subs=[box(x-(joint+2*jc)/2,x+(joint+2*jc)/2,y-(joint+2*jc)/2,y+(joint+2*jc)/2,-0.1,7.6)];let innerY=y-(y<0?-1:1)*(post/2-4.15);for(const z of [LOW_RAIL,pitch-11])subs.push(...mortiseL('Y',x,innerY,y<0?-1:1,z));if(y>0){let innerX=x-(x<0?-1:1)*(post/2-4.15);for(const z of [22,pitch-22])subs.push(...mortiseL('X',innerX,y,x<0?-1:1,z))}p.push(part(`Montante_${sx}${sy}_L1`,'Telaio',[centered(x,y,pitch/2,post,post,pitch),box(x-joint/2,x+joint/2,y-joint/2,y+joint/2,pitch-0.2,pitch+6)],subs))}
  function beamBoxes(axis,cx,by,span,z){let length=span-2*post,adds=[centered(cx,by,z,axis==='Y'?10:length,axis==='Y'?length:10,8)],tip=length/2+7.9-HOOK_LEN/2,hz=z-2.5-HOOK/2+0.1;for(const s of [-1,1]){adds.push(axis==='Y'?centered(cx,by+s*(length/2+3.9),z,6,8.2,5):centered(cx+s*(length/2+3.9),by,z,8.2,6,5));adds.push(axis==='Y'?centered(cx,by+s*tip,hz,6,HOOK_LEN,HOOK+0.2):centered(cx+s*tip,by,hz,HOOK_LEN,6,HOOK+0.2))}return adds}
  function beam(name,axis,cx,by,span,z){p.push(part(name,'Telaio',beamBoxes(axis,cx,by,span,z)))}
  for(const [sx,x,sign] of [['S',-w/2+post/2,-1],['D',w/2-post/2,1]]){beam(`Longherone_${sx}_alta`,'Y',x,0,d,pitch-11);let inner=tw/2+side,web0=inner+3,web1=Math.abs(x)-4;p.push(part(`Longherone_guida_${sx}`,'Guide',[...beamBoxes('Y',x,0,d,LOW_RAIL),centered(sign*(inner+2),0,15,4,rail,12),centered(sign*(inner-1),0,11-vertical-1.5,8,rail,3),centered(sign*(web0+web1)/2,0,12.5,web1-web0,rail,5),centered(sign*(inner+1),d/2-post-8,9,3,7,5)]))}
  for(const [tag,z] of [['bassa',22],['alta',pitch-22]])beam(`Traversa_posteriore_${tag}`,'X',0,d/2-post/2,w,z);
  const grooveCuts=[];for(const x of xs){grooveCuts.push(box(x-gw/2,x+gw/2,cy-td/2+wall-gd,cy-td/2+wall+0.2,floor,floor+gh));grooveCuts.push(box(x-gw/2,x+gw/2,cy+td/2-wall-0.2,cy+td/2-wall+gd,floor,floor+gh))}for(const y of ys){grooveCuts.push(box(-tw/2+wall-gd,-tw/2+wall+0.2,cy+y-gw/2,cy+y+gw/2,floor,floor+gh));grooveCuts.push(box(tw/2-wall-0.2,tw/2-wall+gd,cy+y-gw/2,cy+y+gw/2,floor,floor+gh))}
  const grip=gripBoxes(cy-td/2,11+h,wall,tw,h);p.push(part('Cassetto_L1','Cassetto',[box(-tw/2,tw/2,cy-td/2,cy+td/2,11,11+h),...grip.adds],[box(-tw/2+wall,tw/2-wall,cy-td/2+wall,cy+td/2-wall,floor,11+h+1),...grooveCuts,...grip.subs]));
  if(c.divider_mode!=='open'){let len=td-2*wall+2*gd-0.4;let notches=ys.map(y=>box(-thick/2-0.5,thick/2+0.5,cy+y-gw/2,cy+y+gw/2,floor+gh/2-0.05,floor+gh+0.05));p.push(part('Divisorio_longitudinale','Divisori',[centered(0,cy,floor+gh/2,thick,len,gh)],notches));if(c.divider_mode==='grid'){let target=(td-2*wall)/4;let selected=[-target,0,target].map(t=>ys.reduce((a,b)=>Math.abs(a-t)<Math.abs(b-t)?a:b));[...new Set(selected)].forEach((y,i)=>{let lenx=tw-2*wall+2*gd-0.4;p.push(part(`Divisorio_trasversale_${i+1}`,'Divisori',[centered(0,cy+y,floor+gh/2,lenx,thick,gh)],[box(-gw/2,gw/2,cy+y-thick/2-0.5,cy+y+thick/2+0.5,floor-0.05,floor+gh/2+0.05)]))})}}
  return p.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0).map((v,i)=>({...v,id:`P${String(i+1).padStart(2,'0')}`}))}
// Griglia di celle definita dai bordi di tutti i box; le celle piene sono il pezzo.
function voxelize(adds,subs){
  const axes=[0,2,4].map(k=>[...new Set([...adds,...subs].flatMap(b=>[b[k],b[k+1]]).map(v=>round(v,5)))].sort((a,b)=>a-b));
  const [X,Y,Z]=axes,nx=X.length-1,ny=Y.length-1,nz=Z.length-1;
  if(nx*ny*nz>5000000)throw Error('Troppi dettagli per questa configurazione: aumenta il passo delle sedi.');
  const cells=new Uint8Array(nx*ny*nz),idx=(i,j,k)=>(i*ny+j)*nz+k;
  const lookup=axes.map(a=>new Map(a.map((v,i)=>[v,i])));
  const fill=(b,value)=>{
    const i0=lookup[0].get(round(b[0],5)),i1=lookup[0].get(round(b[1],5));
    const j0=lookup[1].get(round(b[2],5)),j1=lookup[1].get(round(b[3],5));
    const k0=lookup[2].get(round(b[4],5)),k1=lookup[2].get(round(b[5],5));
    for(let i=i0;i<i1;i++)for(let j=j0;j<j1;j++)cells.fill(value,idx(i,j,k0),idx(i,j,k1));
  };
  for(const b of adds)fill(b,1);
  for(const b of subs)fill(b,0);
  return {X,Y,Z,nx,ny,nz,cells,idx};
}
// STL: una faccia per cella esposta, senza bordi a T.
function meshFromBoxes(adds,subs){
  const {X,Y,Z,nx,ny,nz,cells,idx}=voxelize(adds,subs);
  const tris=[],quad=(a,b,c,d)=>{tris.push([a,b,c],[a,c,d])};
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){
    if(!cells[idx(i,j,k)])continue;
    const x0=X[i],x1=X[i+1],y0=Y[j],y1=Y[j+1],z0=Z[k],z1=Z[k+1];
    if(i===0||!cells[idx(i-1,j,k)])quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]);
    if(i===nx-1||!cells[idx(i+1,j,k)])quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]);
    if(j===0||!cells[idx(i,j-1,k)])quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]);
    if(j===ny-1||!cells[idx(i,j+1,k)])quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]);
    if(k===0||!cells[idx(i,j,k-1)])quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]);
    if(k===nz-1||!cells[idx(i,j,k+1)])quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]);
  }
  if(!tris.length)throw Error('Uno dei pezzi è vuoto.');
  return tris;
}

// Anteprima: facce complanari accorpate in rettangoli massimi (meno triangoli, bordi a T ammessi).
function previewMesh(adds,subs){
  const V=voxelize(adds,subs),A=[V.X,V.Y,V.Z],N=[V.nx,V.ny,V.nz],tris=[];
  const full=(p)=>p[0]>=0&&p[1]>=0&&p[2]>=0&&p[0]<N[0]&&p[1]<N[1]&&p[2]<N[2]&&V.cells[V.idx(p[0],p[1],p[2])]===1;
  for(let d=0;d<3;d++){const u=(d+1)%3,v=(d+2)%3,nu=N[u],nv=N[v],mask=new Int8Array(nu*nv);
    for(let s=0;s<=N[d];s++){
      for(let a=0;a<nu;a++)for(let b=0;b<nv;b++){const p=[0,0,0],q=[0,0,0];p[d]=s-1;q[d]=s;p[u]=q[u]=a;p[v]=q[v]=b;const fp=full(p),fq=full(q);mask[a*nv+b]=fp&&!fq?1:fq&&!fp?-1:0}
      for(let a=0;a<nu;a++)for(let b=0;b<nv;){const m=mask[a*nv+b];if(!m){b++;continue}
        let b1=b+1;while(b1<nv&&mask[a*nv+b1]===m)b1++;
        let a1=a+1;grow:for(;a1<nu;a1++){for(let k=b;k<b1;k++)if(mask[a1*nv+k]!==m)break grow}
        for(let i=a;i<a1;i++)for(let k=b;k<b1;k++)mask[i*nv+k]=0;
        const pt=(i,k)=>{const r=[0,0,0];r[d]=A[d][s];r[u]=A[u][i];r[v]=A[v][k];return r};
        const p00=pt(a,b),p10=pt(a1,b),p11=pt(a1,b1),p01=pt(a,b1);
        if(m>0)tris.push([p00,p10,p11],[p00,p11,p01]);else tris.push([p00,p11,p10],[p00,p01,p11]);
        b=b1}
    }}
  return tris;
}

Object.assign(O,{PRESETS,numeric,round,validate,slots,partsForConfig,meshFromBoxes,previewMesh});
})(window.OrganizerCfg=window.OrganizerCfg||{});
