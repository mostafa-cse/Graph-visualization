'use strict';
const NR=22,AS=10,LR=18,ZMN=.08,ZMX=8,ZST=1.15;
const NC={def:['#1a2840','#3f5f8c'],start:['#1e3a8a','#3b82f6'],end:['#7f1d1d','#ef4444'],curr:['#78350f','#f59e0b'],vis:['#2e1065','#8b5cf6'],queue:['#0c2a4a','#38bdf8'],path:['#064e3b','#10b981'],mst:['#3d2806','#f59e0b'],brd:['#450a0a','#ef4444'],ap:['#431407','#f97316'],bpA:['#1e3a5f','#60a5fa'],bpB:['#14532d','#86efac']};
const SCC_F=['#1e1b4b','#0f172a','#052e16','#431407','#1a1a2e','#3b0764'];
const SCC_B=['#a78bfa','#60a5fa','#86efac','#fdba74','#f9a8d4','#c4b5fd'];
/* edge palette — def/rej lifted to clear 3:1 against the #080d18 canvas */
const EC={def:'#46628a',hover:'#7f9dc4',sel:'#a78bfa',hl:'#a78bfa',path:'#10b981',mst:'#f59e0b',brd:'#ef4444',cons:'#3b82f6',rej:'#33465e',tree:'#8b5cf6',back:'#d97706',cross:'#0e7490'};
const G={nodes:[],edges:[],directed:false,weighted:false,allowLoops:false,allowMulti:false,showLabels:true,showWeights:true,showGrid:true,nodeStart:1,defWt:1,nc:0,ec:0};
const UI={mode:'select',zoom:1,panX:0,panY:0,isPan:false,panSX:0,panSY:0,panSPX:0,panSPY:0,selNode:null,selEdge:null,hovNode:null,hovEdge:null,edgeSrc:null,drag:false,dragN:null,dragOX:0,dragOY:0,mx:0,my:0,mwx:0,mwy:0,ctxTgt:null,ctxType:''};
const ANIM={name:null,steps:[],cur:-1,playing:false,timer:null,nC:{},eC:{},speed:5};
const HIST={past:[],future:[]};
const canvas=document.getElementById('canvas');
let ctx=canvas.getContext('2d');
/* VW/VH are CSS-pixel viewport dims; the backing store is DPR times larger */
let DPR=1,VW=0,VH=0;
let DIRTY=true;
const invalidate=()=>{DIRTY=true;};
const outLog=document.getElementById('out-log');
const rval=document.getElementById('rval');
const rsub=document.getElementById('rsub');
const sdot=document.getElementById('sdot');
const stxt=document.getElementById('stxt');
const zlbl=document.getElementById('zlbl');
const modeLbl=document.getElementById('mode-lbl');
const legend=document.getElementById('legend');
const ctxm=document.getElementById('ctxm');
const wtip=document.getElementById('wtip');
const win=document.getElementById('win');
const nid=()=>++G.nc;
const eid=()=>++G.ec;
const s2w=(sx,sy)=>({x:(sx-UI.panX)/UI.zoom,y:(sy-UI.panY)/UI.zoom});
const w2s=(wx,wy)=>({x:wx*UI.zoom+UI.panX,y:wy*UI.zoom+UI.panY});
const gn=id=>G.nodes.find(n=>n.id===id);
function nlbl(n){if(n.label!==undefined)return n.label;return n.id+G.nodeStart-1;}
const hx=(h,i)=>parseInt(h.slice(1+i*2,3+i*2),16);
function mixHex(a,b,t){const r=Math.round(hx(a,0)+(hx(b,0)-hx(a,0))*t),g=Math.round(hx(a,1)+(hx(b,1)-hx(a,1))*t),bl=Math.round(hx(a,2)+(hx(b,2)-hx(a,2))*t);return`rgb(${r},${g},${bl})`;}
function nodeAt(sx,sy){const{x:wx,y:wy}=s2w(sx,sy);for(let i=G.nodes.length-1;i>=0;i--){const n=G.nodes[i];const dx=n.x-wx,dy=n.y-wy;if(dx*dx+dy*dy<=NR*NR)return n;}return null;}
function edgeAt(sx,sy){const{x:wx,y:wy}=s2w(sx,sy);const tol=9/UI.zoom;for(let i=G.edges.length-1;i>=0;i--){const e=G.edges[i];const f=gn(e.from),t=gn(e.to);if(!f||!t)continue;if(e.from===e.to){const g=loopGeom(e);if(g&&Math.abs(Math.hypot(wx-g.cx,wy-g.cy)-LR)<tol)return e;continue;}if(distToEdge(wx,wy,f,t,e)<tol)return e;}return null;}
/* Self-loops on the same node fan around it so they stay individually visible + clickable. */
function loopGeom(e){const f=gn(e.from);if(!f)return null;const loops=G.edges.filter(r=>r.from===r.to&&r.from===e.from);const i=Math.max(0,loops.indexOf(e));const ang=-Math.PI/4+i*(Math.PI/3);return{cx:f.x+Math.cos(ang)*NR*.99,cy:f.y+Math.sin(ang)*NR*.99,ang};}
function distToEdge(px,py,f,t,e){const{cx,cy}=edgeCP(e);if(cx!==null){let md=Infinity;for(let tt=0;tt<=1;tt+=.06){const it=1-tt;const x=it*it*f.x+2*it*tt*cx+tt*tt*t.x;const y=it*it*f.y+2*it*tt*cy+tt*tt*t.y;const dx=px-x,dy=py-y;md=Math.min(md,Math.sqrt(dx*dx+dy*dy));}return md;}const dx=t.x-f.x,dy=t.y-f.y;const l2=dx*dx+dy*dy;if(!l2){const ddx=px-f.x,ddy=py-f.y;return Math.sqrt(ddx*ddx+ddy*ddy);}const tt=Math.max(0,Math.min(1,((px-f.x)*dx+(py-f.y)*dy)/l2));const nx=f.x+tt*dx,ny=f.y+tt*dy;const nnx=px-nx,nny=py-ny;return Math.sqrt(nnx*nnx+nny*nny);}
/* Every edge sharing an unordered endpoint pair gets its own bow, so reverse
   pairs AND parallel multi-edges are all individually visible. The offset sign
   is flipped for reversed edges to keep each curve on a stable world-space side. */
function edgeCP(e){if(e.from===e.to)return{cx:null,cy:null};const a=Math.min(e.from,e.to),b=Math.max(e.from,e.to);const grp=G.edges.filter(r=>r.from!==r.to&&Math.min(r.from,r.to)===a&&Math.max(r.from,r.to)===b);const n=grp.length;if(n<2)return{cx:null,cy:null};const i=grp.indexOf(e);let off=(i-(n-1)/2)*(n===2?56:36);if(e.from!==a)off=-off;const f=gn(e.from),t=gn(e.to);if(!f||!t)return{cx:null,cy:null};const mx=(f.x+t.x)/2,my=(f.y+t.y)/2;const dx=t.x-f.x,dy=t.y-f.y;const len=Math.sqrt(dx*dx+dy*dy)||1;return{cx:mx-(dy/len)*off,cy:my+(dx/len)*off};}
function hasEdge(a,b){return G.directed?G.edges.some(e=>e.from===a&&e.to===b):G.edges.some(e=>(e.from===a&&e.to===b)||(e.from===b&&e.to===a));}
function nbrs(uid){const r=[];for(const e of G.edges){if(e.from===uid)r.push({node:e.to,edge:e,w:e.weight??G.defWt});else if(!G.directed&&e.to===uid)r.push({node:e.from,edge:e,w:e.weight??G.defWt});}return r;}
function revNbrs(uid){const r=[];for(const e of G.edges){if(e.to===uid)r.push({node:e.from,edge:e});else if(!G.directed&&e.from===uid)r.push({node:e.to,edge:e});}return r;}
function cloneG(){return{nodes:G.nodes.map(n=>({...n})),edges:G.edges.map(e=>({...e})),nc:G.nc,ec:G.ec};}
function toast(msg,type='',ms=2400){const wrap=document.getElementById('toasts');const el=document.createElement('div');el.className='toast '+type;el.textContent=msg;wrap.appendChild(el);requestAnimationFrame(()=>el.classList.add('in'));setTimeout(()=>{el.classList.remove('in');setTimeout(()=>el.remove(),260);},ms);while(wrap.children.length>4)wrap.firstChild.remove();}
function updStats(){const v=G.nodes.length,e=G.edges.length;document.getElementById('sv').textContent=v;document.getElementById('se').textContent=e;const max=G.directed?v*(v-1):v*(v-1)/2;document.getElementById('sd').textContent=max>0?Math.round(e/max*100)+'%':'0%';document.getElementById('empty').classList.toggle('gone',v>0);updHistBtns();persist();invalidate();}
function updHistBtns(){document.getElementById('btn-undo').disabled=!HIST.past.length;document.getElementById('btn-redo').disabled=!HIST.future.length;}
function updSel(){['sel-src','sel-dst'].forEach(id=>{const el=document.getElementById(id);const old=el.value;el.innerHTML='<option value="">\u2014 auto \u2014</option>'+G.nodes.map(n=>`<option value="${n.id}">${nlbl(n)}</option>`).join('');if(old)el.value=old;});}
function saveH(){HIST.past.push(cloneG());if(HIST.past.length>60)HIST.past.shift();HIST.future=[];updHistBtns();}
function applyH(s){resetAnim();G.nodes=s.nodes;G.edges=s.edges;G.nc=s.nc;G.ec=s.ec;UI.selNode=null;UI.selEdge=null;updStats();updSel();}
function undo(){if(!HIST.past.length){toast('Nothing to undo');return;}HIST.future.push(cloneG());applyH(HIST.past.pop());updHistBtns();}
function redo(){if(!HIST.future.length){toast('Nothing to redo');return;}HIST.past.push(cloneG());applyH(HIST.future.pop());updHistBtns();}
/* ---------- session persistence ---------- */
const LS_KEY='graphcp.v1';
let persistT=null;
function persistNow(){try{localStorage.setItem(LS_KEY,JSON.stringify({nodes:G.nodes,edges:G.edges,nc:G.nc,ec:G.ec,directed:G.directed,weighted:G.weighted,allowLoops:G.allowLoops,allowMulti:G.allowMulti,showLabels:G.showLabels,showWeights:G.showWeights,showGrid:G.showGrid,nodeStart:G.nodeStart,defWt:G.defWt,view:{z:UI.zoom,x:UI.panX,y:UI.panY}}));}catch(_){}}
function persist(){clearTimeout(persistT);persistT=setTimeout(persistNow,400);}
const persistView=persist;
function setSw(el,on){el.classList.toggle('on',on);el.setAttribute('aria-checked',on?'true':'false');}
function restore(){let s=null;try{s=JSON.parse(localStorage.getItem(LS_KEY)||'null');}catch(_){return false;}if(!s||!Array.isArray(s.nodes)||!s.nodes.length)return false;G.nodes=s.nodes;G.edges=Array.isArray(s.edges)?s.edges:[];G.nc=s.nc||G.nodes.length;G.ec=s.ec||G.edges.length;G.nodeStart=s.nodeStart??1;G.defWt=s.defWt??1;setDir(!!s.directed);setWt(!!s.weighted);[['allowLoops','sw-sl'],['allowMulti','sw-me'],['showLabels','sw-lb'],['showWeights','sw-ew'],['showGrid','sw-gr']].forEach(([k,id])=>{G[k]=!!s[k];setSw(document.getElementById(id),G[k]);});document.getElementById('sel-num').value=String(G.nodeStart);document.getElementById('def-wt').value=G.defWt;if(s.view&&s.view.z){UI.zoom=s.view.z;UI.panX=s.view.x;UI.panY=s.view.y;}updStats();updSel();return true;}
window.addEventListener('pagehide',persistNow);
document.addEventListener('visibilitychange',()=>{if(document.hidden)persistNow();});
function resize(){const cw=document.getElementById('cw');DPR=Math.min(window.devicePixelRatio||1,3);VW=cw.clientWidth;VH=cw.clientHeight;canvas.width=Math.max(1,Math.round(VW*DPR));canvas.height=Math.max(1,Math.round(VH*DPR));invalidate();}
function drawBg(){ctx.fillStyle='#080d18';ctx.fillRect(0,0,VW,VH);if(!G.showGrid)return;const step=44*UI.zoom;if(step<8)return;ctx.fillStyle='rgba(58,82,117,0.5)';const ox=((UI.panX%step)+step)%step;const oy=((UI.panY%step)+step)%step;for(let x=ox-step;x<VW+step;x+=step)for(let y=oy-step;y<VH+step;y+=step){ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.fill();}}
function nodeColors(n){const s=ANIM.nC[n.id];if(!s)return NC.def;if(s.startsWith('scc')){const i=parseInt(s.slice(3))%6;return[SCC_F[i],SCC_B[i]];}return NC[s]||NC.def;}
function edgeColor(e){const s=ANIM.eC[e.id];if(s)return EC[s]||EC.def;if(e===UI.selEdge)return EC.sel;if(e===UI.hovEdge)return EC.hover;return EC.def;}
function drawArr(ex,ey,angle){ctx.save();ctx.translate(ex,ey);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-AS,-AS*.4);ctx.lineTo(-AS,AS*.4);ctx.closePath();ctx.fill();ctx.restore();}
function rRect(c,x,y,w,h,r){if(c.roundRect){c.beginPath();c.roundRect(x,y,w,h,r);}else{c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.arcTo(x+w,y,x+w,y+r,r);c.lineTo(x+w,y+h-r);c.arcTo(x+w,y+h,x+w-r,y+h,r);c.lineTo(x+r,y+h);c.arcTo(x,y+h,x,y+h-r,r);c.lineTo(x,y+r);c.arcTo(x,y,x+r,y,r);c.closePath();}}
function drawEdge(e){const f=gn(e.from),t=gn(e.to);if(!f||!t)return;const col=edgeColor(e);ctx.save();ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=e===UI.selEdge?2.5:1.8;if(f.id===t.id){const g=loopGeom(e);ctx.beginPath();ctx.arc(g.cx,g.cy,LR,0,Math.PI*2);ctx.stroke();if(G.directed){const th=g.ang+Math.PI*.21;drawArr(g.cx+LR*Math.cos(th),g.cy+LR*Math.sin(th),g.ang-Math.PI*.25);}if(G.weighted&&e.weight!==undefined&&G.showWeights)drawWL(f.x+Math.cos(g.ang)*NR*2.4,f.y+Math.sin(g.ang)*NR*2.4,e.weight,col);ctx.restore();return;}const{cx:cpx,cy:cpy}=edgeCP(e);const curved=cpx!==null;const dx=t.x-f.x,dy=t.y-f.y;const len=Math.sqrt(dx*dx+dy*dy)||1;let sx,sy,ex2,ey2,midX,midY;if(curved){const dsX=cpx-f.x,dsY=cpy-f.y;const lS=Math.sqrt(dsX*dsX+dsY*dsY)||1;sx=f.x+(dsX/lS)*NR;sy=f.y+(dsY/lS)*NR;const deX=cpx-t.x,deY=cpy-t.y;const lE=Math.sqrt(deX*deX+deY*deY)||1;ex2=t.x+(deX/lE)*NR;ey2=t.y+(deY/lE)*NR;midX=.25*sx+.5*cpx+.25*ex2;midY=.25*sy+.5*cpy+.25*ey2;ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(cpx,cpy,ex2,ey2);ctx.stroke();if(G.directed){const tt=.95;const atx=2*(1-tt)*(cpx-sx)+2*tt*(ex2-cpx);const aty=2*(1-tt)*(cpy-sy)+2*tt*(ey2-cpy);drawArr(ex2,ey2,Math.atan2(aty,atx));}}else{sx=f.x+(dx/len)*NR;sy=f.y+(dy/len)*NR;ex2=t.x-(dx/len)*NR;ey2=t.y-(dy/len)*NR;midX=(sx+ex2)/2;midY=(sy+ey2)/2;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex2,ey2);ctx.stroke();if(G.directed)drawArr(ex2,ey2,Math.atan2(dy,dx));}if(G.weighted&&e.weight!==undefined&&G.showWeights)drawWL(midX,midY,e.weight,col);ctx.restore();}
function drawWL(x,y,w,col){const text=String(w);ctx.save();ctx.font='500 11px JetBrains Mono,monospace';const tw=ctx.measureText(text).width,pad=3;ctx.fillStyle='rgba(8,13,24,.9)';rRect(ctx,x-tw/2-pad,y-8,tw+pad*2,14,3);ctx.fill();ctx.strokeStyle=col+'55';ctx.lineWidth=.6;ctx.stroke();ctx.fillStyle=col;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y+.5);ctx.restore();}
function drawNode(n){const[fill,border]=nodeColors(n);const isSel=n===UI.selNode,isES=n===UI.edgeSrc,isHov=n===UI.hovNode;ctx.save();if(isSel||isES||isHov||ANIM.nC[n.id]){ctx.shadowColor=border;ctx.shadowBlur=isES?22:(isHov&&!isSel?10:14);}ctx.beginPath();ctx.arc(n.x,n.y,NR,0,Math.PI*2);const gr=ctx.createLinearGradient(n.x,n.y-NR,n.x,n.y+NR);gr.addColorStop(0,mixHex(fill,'#ffffff',.1));gr.addColorStop(1,fill);ctx.fillStyle=gr;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=isSel?'#a78bfa':(isES?'#60a5fa':border);ctx.lineWidth=isSel?2.5:(isHov?2:1.5);ctx.stroke();if(isSel){ctx.beginPath();ctx.arc(n.x,n.y,NR+5,0,Math.PI*2);ctx.strokeStyle='rgba(167,139,250,.22)';ctx.lineWidth=2.5;ctx.stroke();}if(isES){ctx.beginPath();ctx.arc(n.x,n.y,NR+5,0,Math.PI*2);ctx.strokeStyle='rgba(96,165,250,.3)';ctx.lineWidth=2;ctx.stroke();}if(G.showLabels){const lbl=String(nlbl(n));ctx.fillStyle='#f2f7fd';ctx.font=`600 ${lbl.length>3?9:lbl.length>2?11:13}px Inter,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(lbl,n.x,n.y+.5);}ctx.restore();}
function drawTemp(){if(!UI.edgeSrc)return;const f=UI.edgeSrc;const{x:wx,y:wy}=s2w(UI.mx,UI.my);const dx=wx-f.x,dy=wy-f.y;const len=Math.sqrt(dx*dx+dy*dy)||1;ctx.save();ctx.strokeStyle='#7c3aed';ctx.lineWidth=1.8;ctx.setLineDash([6,4]);ctx.globalAlpha=.65;ctx.beginPath();ctx.moveTo(f.x+(dx/len)*NR,f.y+(dy/len)*NR);ctx.lineTo(wx,wy);ctx.stroke();ctx.restore();}
function drawScene(){drawBg();ctx.save();ctx.translate(UI.panX,UI.panY);ctx.scale(UI.zoom,UI.zoom);G.edges.forEach(drawEdge);if(UI.edgeSrc&&UI.mode==='addEdge')drawTemp();G.nodes.forEach(drawNode);ctx.restore();}
/* Redraw only when something changed — an idle graph costs no frames. */
function render(){requestAnimationFrame(render);if(!DIRTY)return;DIRTY=false;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,VW,VH);drawScene();zlbl.textContent=Math.round(UI.zoom*100)+'%';}
['pointerdown','pointerup','pointermove','wheel','keydown','keyup','click','input','change'].forEach(t=>document.addEventListener(t,invalidate,true));
canvas.addEventListener('mousedown',onMD);
canvas.addEventListener('mousemove',onMM);
canvas.addEventListener('mouseup',onMU);
canvas.addEventListener('wheel',onWh,{passive:false});
canvas.addEventListener('contextmenu',onCM);
canvas.addEventListener('dblclick',onDbl);
function onMD(e){if(e.button===1){e.preventDefault();startPan(e);return;}if(e.button!==0)return;UI.mx=e.offsetX;UI.my=e.offsetY;hideCtx();hideWtip();const node=nodeAt(e.offsetX,e.offsetY);const edge=node?null:edgeAt(e.offsetX,e.offsetY);if(UI.mode==='select'){if(node){selNode(node);UI.drag=true;UI.dragN=node;const{x,y}=s2w(e.offsetX,e.offsetY);UI.dragOX=node.x-x;UI.dragOY=node.y-y;}else if(edge){selEdge(edge);}else{desel();startPan(e);}}else if(UI.mode==='addNode'){if(!node)addNode(e.offsetX,e.offsetY);}else if(UI.mode==='addEdge'){if(node){if(!UI.edgeSrc){UI.edgeSrc=node;}else{if(UI.edgeSrc!==node||G.allowLoops)addEdge(UI.edgeSrc,node);UI.edgeSrc=null;}}else UI.edgeSrc=null;}else if(UI.mode==='delete'){if(node)delNode(node);else if(edge)delEdge(edge);}}
function startPan(e){UI.isPan=true;UI.panSX=e.offsetX;UI.panSY=e.offsetY;UI.panSPX=UI.panX;UI.panSPY=UI.panY;updCursor();}
function onMM(e){UI.mx=e.offsetX;UI.my=e.offsetY;const{x,y}=s2w(e.offsetX,e.offsetY);UI.mwx=x;UI.mwy=y;if(UI.isPan){UI.panX=UI.panSPX+(e.offsetX-UI.panSX);UI.panY=UI.panSPY+(e.offsetY-UI.panSY);return;}if(UI.drag&&UI.dragN){UI.dragN.x=x+UI.dragOX;UI.dragN.y=y+UI.dragOY;return;}const pn=UI.hovNode;UI.hovNode=nodeAt(e.offsetX,e.offsetY);UI.hovEdge=UI.hovNode?null:edgeAt(e.offsetX,e.offsetY);if(pn!==UI.hovNode)updCursor();}
function onMU(e){if(UI.isPan){UI.isPan=false;persistView();}if(UI.drag&&UI.dragN){saveH();UI.drag=false;UI.dragN=null;persist();}updCursor();}
/* Wheel zooms at the pointer; shift+wheel scrubs horizontally. */
function onWh(e){e.preventDefault();if(e.shiftKey&&!e.ctrlKey&&!e.metaKey){UI.panX-=e.deltaY;persistView();return;}const f=e.deltaY>0?1/ZST:ZST;const nz=Math.max(ZMN,Math.min(ZMX,UI.zoom*f));const{x,y}=s2w(e.offsetX,e.offsetY);UI.zoom=nz;UI.panX=e.offsetX-x*UI.zoom;UI.panY=e.offsetY-y*UI.zoom;persistView();}
function onCM(e){e.preventDefault();const node=nodeAt(e.offsetX,e.offsetY);const edge=node?null:edgeAt(e.offsetX,e.offsetY);if(!node&&!edge)return;UI.ctxTgt=node||edge;UI.ctxType=node?'node':'edge';document.getElementById('cm-label').style.display=node?'':'none';document.getElementById('cm-weight').style.display=G.weighted?'':'none';document.getElementById('cm-src').style.display=node?'':'none';document.getElementById('cm-dst').style.display=node?'':'none';ctxm.classList.add('show');const mw=ctxm.offsetWidth||160,mh=ctxm.offsetHeight||140;const px=Math.min(e.pageX,window.innerWidth-mw-10),py=Math.min(e.pageY,window.innerHeight-mh-10);ctxm.style.left=Math.max(10,px)+'px';ctxm.style.top=Math.max(10,py)+'px';}
function onDbl(e){const node=nodeAt(e.offsetX,e.offsetY);if(node){editLabel(node);return;}if(UI.mode==='select'||UI.mode==='addNode')addNode(e.offsetX,e.offsetY);}
function hideCtx(){ctxm.classList.remove('show');}
function hideWtip(){wtip.classList.remove('show');}
document.addEventListener('click',e=>{if(!ctxm.contains(e.target))hideCtx();});
document.getElementById('cm-del').onclick=()=>{if(!UI.ctxTgt)return;UI.ctxType==='node'?delNode(UI.ctxTgt):delEdge(UI.ctxTgt);hideCtx();};
document.getElementById('cm-label').onclick=()=>{if(UI.ctxTgt&&UI.ctxType==='node')editLabel(UI.ctxTgt);hideCtx();};
document.getElementById('cm-weight').onclick=()=>{if(UI.ctxTgt&&UI.ctxType==='edge')showWtip(UI.ctxTgt);hideCtx();};
document.getElementById('cm-src').onclick=()=>{if(UI.ctxTgt&&UI.ctxType==='node'){document.getElementById('sel-src').value=UI.ctxTgt.id;switchTab('algo');toast('Source set','ok');}hideCtx();};
document.getElementById('cm-dst').onclick=()=>{if(UI.ctxTgt&&UI.ctxType==='node'){document.getElementById('sel-dst').value=UI.ctxTgt.id;switchTab('algo');toast('Destination set','ok');}hideCtx();};
function addNode(sx,sy){saveH();const{x,y}=s2w(sx,sy);const n={id:nid(),x,y};G.nodes.push(n);updStats();updSel();return n;}
function addEdge(f,t){if(!G.allowMulti&&hasEdge(f.id,t.id)){if(G.weighted){const ex=G.edges.find(e=>(e.from===f.id&&e.to===t.id)||(!G.directed&&e.from===t.id&&e.to===f.id));if(ex)showWtip(ex);}return;}saveH();const e={id:eid(),from:f.id,to:t.id,weight:G.defWt};G.edges.push(e);if(G.weighted)showWtip(e,true);updStats();return e;}
function delNode(n){saveH();G.nodes=G.nodes.filter(x=>x.id!==n.id);G.edges=G.edges.filter(e=>e.from!==n.id&&e.to!==n.id);if(UI.selNode===n)UI.selNode=null;updStats();updSel();}
function delEdge(e){saveH();G.edges=G.edges.filter(x=>x.id!==e.id);if(UI.selEdge===e)UI.selEdge=null;updStats();}
function selNode(n){UI.selNode=n;UI.selEdge=null;}
function selEdge(e){UI.selEdge=e;UI.selNode=null;}
function desel(){UI.selNode=null;UI.selEdge=null;}
function editLabel(n){promptModal('Edit Node Label','Label (leave blank to reset to index)',nlbl(n),v=>{saveH();n.label=v.trim()===''?undefined:v.trim();updSel();updStats();});}
/* wtip is position:fixed, so canvas-local coords must be offset by the canvas
   rect — otherwise the popover lands up-left by the sidebar + header size. */
function showWtip(edge,isNew=false){const f=gn(edge.from),t=gn(edge.to);if(!f||!t)return;const mid=edge.from===edge.to?w2s(f.x+NR*1.6,f.y-NR*1.6):w2s((f.x+t.x)/2,(f.y+t.y)/2);win.value=edge.weight??G.defWt;wtip.classList.add('show');const r=canvas.getBoundingClientRect(),w=wtip.offsetWidth||160,h=wtip.offsetHeight||42;wtip.style.left=Math.max(8,Math.min(r.left+mid.x+10,window.innerWidth-w-8))+'px';wtip.style.top=Math.max(8,Math.min(r.top+mid.y-h/2,window.innerHeight-h-8))+'px';win.focus();win.select();const ok=()=>{const v=parseFloat(win.value);if(!isNaN(v)){saveH();edge.weight=v;persist();invalidate();}else if(isNew)delEdge(edge);hideWtip();};document.getElementById('wok').onclick=ok;document.getElementById('wcancel').onclick=()=>{if(isNew)delEdge(edge);hideWtip();};win.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();ok();}if(ev.key==='Escape'){ev.stopPropagation();if(isNew)delEdge(edge);hideWtip();}};}
function promptModal(title,label,value,onOk){openModal(title,`<div class="tmf"><div class="field"><label for="pm-in">${label}</label><input type="text" id="pm-in"></div><div class="modal-acts"><button class="btn btn-s" id="pm-cx">Cancel</button><button class="btn btn-p" id="pm-ok">Save</button></div></div>`);const inp=document.getElementById('pm-in');inp.value=String(value);const done=()=>{const v=inp.value;closeModal();onOk(v);};document.getElementById('pm-ok').onclick=done;document.getElementById('pm-cx').onclick=closeModal;inp.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();done();}if(ev.key==='Escape'){ev.stopPropagation();closeModal();}};setTimeout(()=>{inp.focus();inp.select();},30);}
function confirmModal(title,msg,okLabel,onOk){openModal(title,`<div class="tmf"><p class="tmf-desc">${msg}</p><div class="modal-acts"><button class="btn btn-s" id="cf-cx">Cancel</button><button class="btn btn-d" id="cf-ok">${okLabel}</button></div></div>`);document.getElementById('cf-cx').onclick=closeModal;document.getElementById('cf-ok').onclick=()=>{closeModal();onOk();};setTimeout(()=>document.getElementById('cf-ok').focus(),30);}
function setMode(m){UI.mode=m;UI.edgeSrc=null;document.querySelectorAll('.tbtn[id^="t-"]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});const map={select:'t-sel',addNode:'t-node',addEdge:'t-edge',delete:'t-del'};if(map[m]){const b=document.getElementById(map[m]);b.classList.add('active');b.setAttribute('aria-pressed','true');}const ms={select:'Select / Move  [V]',addNode:'Add Node  [N]  \u2014 click canvas',addEdge:'Add Edge  [E]  \u2014 click source, then target',delete:'Delete Mode  [Del]  \u2014 click to remove'};modeLbl.textContent=ms[m]||m;updCursor();invalidate();}
/* Cursor reflects what the next click will actually do. */
function updCursor(){let c=({addNode:'m-node',addEdge:'m-edge',delete:'m-del'})[UI.mode]||'';if(UI.isPan)c='m-panning';else if(UI.drag)c='m-dragging';else if(UI.mode==='select'&&UI.hovNode)c='m-grab';canvas.className=c;}
document.getElementById('t-sel').onclick=()=>setMode('select');
document.getElementById('t-node').onclick=()=>setMode('addNode');
document.getElementById('t-edge').onclick=()=>setMode('addEdge');
document.getElementById('t-del').onclick=()=>setMode('delete');
document.getElementById('btn-undo').onclick=undo;
document.getElementById('btn-redo').onclick=redo;
document.getElementById('btn-clear').onclick=()=>{if(!G.nodes.length){toast('Graph is already empty');return;}confirmModal('Clear Graph',`This removes all ${G.nodes.length} node(s) and ${G.edges.length} edge(s). You can still undo with Ctrl+Z.`,'Clear graph',()=>{saveH();G.nodes=[];G.edges=[];G.nc=0;G.ec=0;resetAnim();updStats();updSel();toast('Graph cleared','ok');});};
document.getElementById('btn-fit').onclick=fitView;
function setDir(v){G.directed=v;const c=document.getElementById('chip-dir');c.textContent=v?'Directed':'Undirected';c.classList.toggle('on',v);c.setAttribute('aria-pressed',v?'true':'false');setSw(document.getElementById('sw-dir'),v);if(ANIM.name)selAlgo(ANIM.name);updStats();}
function setWt(v){G.weighted=v;const c=document.getElementById('chip-wt');c.textContent=v?'Weighted':'Unweighted';c.classList.toggle('on',v);c.setAttribute('aria-pressed',v?'true':'false');setSw(document.getElementById('sw-wt'),v);invalidate();persist();}
document.getElementById('chip-dir').onclick=()=>setDir(!G.directed);
document.getElementById('chip-wt').onclick=()=>setWt(!G.weighted);
document.getElementById('sw-dir').onclick=()=>setDir(!G.directed);
document.getElementById('sw-wt').onclick=()=>setWt(!G.weighted);
function mkSw(id,getter,setter){const el=document.getElementById(id);el.onclick=()=>{setter(!getter());setSw(el,getter());persist();invalidate();};}
mkSw('sw-sl',()=>G.allowLoops,v=>G.allowLoops=v);
mkSw('sw-me',()=>G.allowMulti,v=>G.allowMulti=v);
mkSw('sw-lb',()=>G.showLabels,v=>G.showLabels=v);
mkSw('sw-ew',()=>G.showWeights,v=>G.showWeights=v);
mkSw('sw-gr',()=>G.showGrid,v=>G.showGrid=v);
document.getElementById('sel-num').onchange=e=>{G.nodeStart=parseInt(e.target.value);updSel();updStats();};
document.getElementById('def-wt').onchange=e=>{G.defWt=parseFloat(e.target.value)||1;persist();};
document.getElementById('z-in').onclick=()=>zoomAt(VW/2,VH/2,ZST);
document.getElementById('z-out').onclick=()=>zoomAt(VW/2,VH/2,1/ZST);
document.getElementById('z-fit').onclick=fitView;
function zoomAt(cx,cy,f){const{x,y}=s2w(cx,cy);UI.zoom=Math.max(ZMN,Math.min(ZMX,UI.zoom*f));UI.panX=cx-x*UI.zoom;UI.panY=cy-y*UI.zoom;persistView();invalidate();}
function fitView(){if(!G.nodes.length){UI.zoom=1;UI.panX=VW/2;UI.panY=VH/2;invalidate();return;}const pad=60;const xs=G.nodes.map(n=>n.x),ys=G.nodes.map(n=>n.y);const minX=Math.min(...xs)-pad,maxX=Math.max(...xs)+pad;const minY=Math.min(...ys)-pad,maxY=Math.max(...ys)+pad;const sx=VW/(maxX-minX),sy=VH/(maxY-minY);UI.zoom=Math.max(ZMN,Math.min(ZMX,Math.min(sx,sy)*.95));UI.panX=VW/2-((minX+maxX)/2)*UI.zoom;UI.panY=VH/2-((minY+maxY)/2)*UI.zoom;persistView();invalidate();}
function switchTab(t){document.querySelectorAll('.stab').forEach(s=>{const on=s.dataset.tab===t;s.classList.toggle('on',on);s.setAttribute('aria-selected',on?'true':'false');});['settings','algo','io'].forEach(id=>{document.getElementById('tab-'+id).classList.toggle('gone',id!==t);});}
document.querySelectorAll('.stab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
document.getElementById('tmpl-grid').addEventListener('click',e=>{const it=e.target.closest('.tmpl-item');if(!it)return;showTmpl(it.dataset.t);});
function showTmpl(type){const cfgs={path:{lbl:'Path Graph',ps:[{n:'n',l:'Nodes',d:6}]},cycle:{lbl:'Cycle Graph',ps:[{n:'n',l:'Nodes',d:7}]},complete:{lbl:'Complete K\u2099',ps:[{n:'n',l:'Nodes',d:5}]},star:{lbl:'Star Graph',ps:[{n:'n',l:'Leaves',d:7}]},bipartite:{lbl:'Complete Bipartite',ps:[{n:'m',l:'Left',d:3},{n:'n',l:'Right',d:3}]},tree:{lbl:'Binary Tree',ps:[{n:'d',l:'Depth',d:3}]},grid:{lbl:'Grid Graph',ps:[{n:'r',l:'Rows',d:3},{n:'c',l:'Cols',d:4}]},random:{lbl:'Random Graph',ps:[{n:'n',l:'Nodes',d:9},{n:'p',l:'Edge prob%',d:40}]}};const cfg=cfgs[type];if(!cfg)return;openModal(cfg.lbl,`<div class="tmf"><p class="tmf-desc">This replaces the current graph. You can undo it with <kbd>Ctrl+Z</kbd>.</p><div class="input-row">${cfg.ps.map(p=>`<div class="field"><label for="tg-${p.n}">${p.l}</label><input type="number" id="tg-${p.n}" value="${p.d}" min="1" max="99"></div>`).join('')}</div><div class="modal-acts"><button class="btn btn-s" id="tg-cx">Cancel</button><button class="btn btn-p" id="tg-gen">Generate</button></div></div>`);const gen=()=>{const params={};cfg.ps.forEach(p=>{params[p.n]=parseFloat(document.getElementById('tg-'+p.n).value)||p.d;});genTmpl(type,params);closeModal();};document.getElementById('tg-cx').onclick=closeModal;document.getElementById('tg-gen').onclick=gen;document.getElementById('modal-b').querySelectorAll('input').forEach(i=>i.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();gen();}});const f=document.getElementById('tg-'+cfg.ps[0].n);setTimeout(()=>{f.focus();f.select();},30);}
function genTmpl(type,p){saveH();G.nodes=[];G.edges=[];G.nc=0;G.ec=0;const AN=(x,y)=>{const n={id:nid(),x,y};G.nodes.push(n);return n;};const AE=(a,b,w)=>G.edges.push({id:eid(),from:a.id,to:b.id,weight:w??G.defWt});const cx=0,cy=0;if(type==='path'){const n=Math.max(2,Math.min(50,p.n|0));const ns=[];for(let i=0;i<n;i++)ns.push(AN(cx+(i-(n-1)/2)*80,cy));for(let i=0;i<n-1;i++)AE(ns[i],ns[i+1]);}else if(type==='cycle'){const n=Math.max(3,Math.min(60,p.n|0));const r=Math.max(70,n*18);const ns=[];for(let i=0;i<n;i++)ns.push(AN(cx+r*Math.cos(i/n*Math.PI*2-Math.PI/2),cy+r*Math.sin(i/n*Math.PI*2-Math.PI/2)));for(let i=0;i<n;i++)AE(ns[i],ns[(i+1)%n]);}else if(type==='complete'){const n=Math.max(2,Math.min(20,p.n|0));const r=Math.max(70,n*26);const ns=[];for(let i=0;i<n;i++)ns.push(AN(cx+r*Math.cos(i/n*Math.PI*2-Math.PI/2),cy+r*Math.sin(i/n*Math.PI*2-Math.PI/2)));for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)AE(ns[i],ns[j]);}else if(type==='star'){const n=Math.max(2,Math.min(40,p.n|0));const cen=AN(cx,cy);const r=Math.max(90,n*14);for(let i=0;i<n;i++){const lf=AN(cx+r*Math.cos(i/n*Math.PI*2),cy+r*Math.sin(i/n*Math.PI*2));AE(cen,lf);}}else if(type==='bipartite'){const m=Math.max(1,Math.min(15,p.m|0)),n=Math.max(1,Math.min(15,p.n|0));const L=[],R=[];for(let i=0;i<m;i++)L.push(AN(cx-110,cy+(i-(m-1)/2)*72));for(let i=0;i<n;i++)R.push(AN(cx+110,cy+(i-(n-1)/2)*72));for(const a of L)for(const b of R)AE(a,b);}else if(type==='tree'){const depth=Math.max(1,Math.min(6,p.d|0));const build=(d,x,y,dx)=>{const nd=AN(x,y);if(d<depth){const c1=build(d+1,x-dx,y+80,dx/2);const c2=build(d+1,x+dx,y+80,dx/2);AE(nd,c1);AE(nd,c2);}return nd;};build(1,cx,cy-depth*40,Math.pow(2,depth)*22);}else if(type==='grid'){const rows=Math.max(2,Math.min(10,p.r|0)),cols=Math.max(2,Math.min(10,p.c|0));const grid=[];for(let r=0;r<rows;r++){grid[r]=[];for(let c=0;c<cols;c++)grid[r][c]=AN(cx+(c-(cols-1)/2)*80,cy+(r-(rows-1)/2)*80);}for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){if(c+1<cols)AE(grid[r][c],grid[r][c+1]);if(r+1<rows)AE(grid[r][c],grid[r+1][c]);}}else if(type==='random'){const n=Math.max(2,Math.min(30,p.n|0)),prob=(p.p||40)/100;const r=Math.max(80,n*20);const ns=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,sc=(Math.random()-.5)*r*.25;ns.push(AN(cx+(r+sc)*Math.cos(a),cy+(r+sc)*Math.sin(a)));}for(let i=0;i<n;i++)for(let j=G.directed?0:i+1;j<n;j++)if(i!==j&&Math.random()<prob)AE(ns[i],ns[j],G.weighted?Math.ceil(Math.random()*20):G.defWt);}updStats();updSel();setTimeout(fitView,50);toast(`Generated ${G.nodes.length}V, ${G.edges.length}E`,'ok');}
const ALGO_META={
  bfs:{n:'Breadth-First Search',cx:'O(V + E)',note:'Explores layer by layer. Gives shortest paths on unweighted graphs.'},
  dfs:{n:'Depth-First Search',cx:'O(V + E)',note:'Explores as deep as possible first. Classifies tree and back edges.'},
  dijkstra:{n:'Dijkstra',cx:'O(V² + E)',note:'Single-source shortest path. Requires non-negative weights. Set a destination to trace one path.'},
  bellman:{n:'Bellman-Ford',cx:'O(V · E)',note:'Handles negative weights and detects negative cycles.'},
  floyd:{n:'Floyd-Warshall',cx:'O(V³)',note:'All-pairs shortest paths. No source node needed.'},
  kruskal:{n:'Kruskal MST',cx:'O(E log E)',note:'Sorts edges, adds them with union-find. Works on the whole graph.'},
  prim:{n:'Prim MST',cx:'O(V² + E)',note:'Grows a single tree outward from the source node.'},
  bridges:{n:'Find Bridges',cx:'O(V + E)',note:"Tarjan low-link. Finds edges whose removal disconnects the graph."},
  artic:{n:'Articulation Points',cx:'O(V + E)',note:'Tarjan low-link. Finds nodes whose removal disconnects the graph.'},
  scc:{n:'SCC (Kosaraju)',cx:'O(V + E)',note:'Two-pass DFS. Only meaningful on a directed graph.',needs:'directed'},
  bipartite:{n:'Bipartite Check',cx:'O(V + E)',note:'2-colouring via BFS. Fails exactly when an odd cycle exists.'},
  topo:{n:'Topological Sort',cx:'O(V + E)',note:"Kahn's algorithm. Requires a directed acyclic graph.",needs:'directed'},
  euler:{n:'Euler Circuit',cx:'O(V + E)',note:'Checks degree conditions, then walks the circuit.'}
};
/* Legend entries per algorithm: ['n'|'e', paletteKey, label] */
const LEG={
  bfs:[['n','start','Source'],['n','curr','Processing'],['n','queue','In queue'],['n','vis','Visited'],['e','tree','Tree edge'],['e','cross','Non-tree edge']],
  dfs:[['n','start','Source'],['n','curr','On stack'],['n','vis','Finished'],['e','tree','Tree edge'],['e','back','Back edge']],
  dijkstra:[['n','start','Source'],['n','end','Destination'],['n','curr','Extracting'],['n','queue','Relaxed'],['n','vis','Settled'],['n','path','On path'],['e','hl','Relaxed edge'],['e','path','Shortest path']],
  bellman:[['n','start','Source'],['n','queue','Updated'],['n','vis','Final'],['e','path','Relaxed edge'],['e','brd','Negative cycle']],
  floyd:[['n','curr','Intermediate k']],
  kruskal:[['n','mst','In MST'],['e','cons','Considering'],['e','mst','Accepted'],['e','rej','Rejected (cycle)']],
  prim:[['n','start','Source'],['n','mst','In MST'],['n','queue','Frontier'],['e','hl','Candidate'],['e','mst','In MST']],
  bridges:[['n','curr','Visiting'],['n','vis','Done'],['n','brd','Bridge endpoint'],['e','tree','Tree edge'],['e','back','Back edge'],['e','brd','Bridge']],
  artic:[['n','curr','Visiting'],['n','vis','Done'],['n','ap','Articulation point'],['e','tree','Tree edge'],['e','back','Back edge']],
  scc:[['n','curr','Phase 1 visit'],['n','vis','Ordered']],
  bipartite:[['n','bpA','Group A'],['n','bpB','Group B'],['e','tree','Valid edge'],['e','brd','Conflict']],
  topo:[['n','start','In-degree 0'],['n','curr','Processing'],['n','queue','Newly ready'],['n','vis','Placed'],['e','path','Removed edge']],
  euler:[['n','curr','Current node'],['e','path','Traversed']]
};
function buildLegend(name){const rows=LEG[name];if(!rows){legend.classList.remove('show');return;}let h=`<div class="leg-h">${(ALGO_META[name]||{}).n||name}</div>`;for(const[k,c,lbl]of rows){if(k==='n'){const[f,b]=NC[c]||NC.def;h+=`<div class="leg-row"><span class="leg-dot" style="background:${f};border-color:${b}"></span>${lbl}</div>`;}else h+=`<div class="leg-row"><span class="leg-line" style="border-color:${EC[c]||EC.def}"></span>${lbl}</div>`;}
  if(name==='scc')h+=`<div class="leg-row" style="margin-top:2px">${SCC_B.map(c=>`<span class="leg-dot" style="background:${c};border-color:${c}"></span>`).join('')}<span style="margin-left:2px">Components</span></div>`;
  legend.innerHTML=h;legend.classList.add('show');}
function selAlgo(name){document.querySelectorAll('.algo-item').forEach(el=>el.classList.toggle('sel',el.dataset.algo===name));ANIM.name=name;document.getElementById('p-dst').classList.toggle('gone',name!=='dijkstra');const ns=['kruskal','bridges','artic','scc','bipartite','topo','euler','floyd'].includes(name);document.getElementById('p-src').classList.toggle('gone',ns);const m=ALGO_META[name];if(m){const warn=m.needs==='directed'&&!G.directed?'<div class="ai-note" style="color:var(--orangeL)">⚠ Needs a directed graph — enable it in Settings.</div>':'';document.getElementById('algo-info').innerHTML=`<div class="ai-name">${m.n}</div><div class="ai-cx">${m.cx}</div><div class="ai-note">${m.note}</div>${warn}`;}}
document.querySelectorAll('.algo-item').forEach(el=>{el.addEventListener('click',()=>selAlgo(el.dataset.algo));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selAlgo(el.dataset.algo);}});});
function setSpeed(v){ANIM.speed=Math.max(1,Math.min(10,parseInt(v)||5));document.getElementById('spd-sl').value=ANIM.speed;document.getElementById('tp-spd').value=ANIM.speed;document.getElementById('spd-val').textContent=ANIM.speed+'x';}
document.getElementById('spd-sl').oninput=e=>setSpeed(e.target.value);
document.getElementById('tp-spd').oninput=e=>setSpeed(e.target.value);
document.getElementById('btn-run').onclick=runAlgo;
function runAlgo(){if(!ANIM.name){toast('Select an algorithm first','err');return;}if(!G.nodes.length){toast('Add some nodes first','err');return;}resetAnim();const srcId=parseInt(document.getElementById('sel-src').value)||G.nodes[0]?.id;const dstId=parseInt(document.getElementById('sel-dst').value)||null;let res;try{switch(ANIM.name){case 'bfs':res=aBFS(srcId);break;case 'dfs':res=aDFS(srcId);break;case 'dijkstra':res=aDijkstra(srcId,dstId);break;case 'bellman':res=aBellman(srcId);break;case 'floyd':res=aFloyd();break;case 'kruskal':res=aKruskal();break;case 'prim':res=aPrim(srcId);break;case 'bridges':res=aBridges();break;case 'artic':res=aArtic();break;case 'scc':res=aSCC();break;case 'bipartite':res=aBipartite();break;case 'topo':res=aTopo();break;case 'euler':res=aEuler();break;}}catch(err){console.error(err);toast('Error: '+err.message,'err');return;}if(!res){sdot.className='sdot err';stxt.textContent='Not run';return;}ANIM.steps=res.steps||[];buildLegend(ANIM.name);document.getElementById('tp-name').textContent=(ALGO_META[ANIM.name]||{}).n||ANIM.name;document.getElementById('transport').classList.remove('gone');if(ANIM.steps.length){applyStep(0);sdot.className='sdot run';stxt.textContent='Running\u2026';startPlay();}else{applyFinal(res);sdot.className='sdot done';stxt.textContent='Done';}}
/* ---------- step player ---------- */
let stepRows=[];
function clearRunLog(){outLog.querySelectorAll('.run-row').forEach(r=>r.remove());stepRows=[];}
/* Rows are anchored to steps: scrubbing back trims instead of re-appending,
   so the log always mirrors the frame you are looking at. */
function renderStepLog(i){while(stepRows.length>i+1)stepRows.pop().remove();for(let k=stepRows.length;k<=i;k++){const s=ANIM.steps[k];stepRows.push(addLog(k+1,s.msg||'',s.t||'',true));}stepRows.forEach((r,k)=>r.classList.toggle('cur',k===i));if(stepRows[i])stepRows[i].scrollIntoView({block:'nearest'});}
function applyStep(i){const n=ANIM.steps.length;if(!n)return;i=Math.max(0,Math.min(i,n-1));ANIM.cur=i;const s=ANIM.steps[i];ANIM.nC={...(s.nC||{})};ANIM.eC={...(s.eC||{})};renderStepLog(i);if(s.rv){rval.textContent=s.rv;rsub.textContent=s.rs||'';}updTransport();invalidate();}
function applyFinal(res){if(res.nC)ANIM.nC={...res.nC};if(res.eC)ANIM.eC={...res.eC};if(res.msg)addLog('\u2713',res.msg,'ok',true);if(res.rv){rval.textContent=res.rv;rsub.textContent=res.rs||'';}updTransport();invalidate();}
function updTransport(){const n=ANIM.steps.length,sk=document.getElementById('tp-seek');sk.max=Math.max(0,n-1);sk.value=Math.max(0,ANIM.cur);sk.disabled=n<2;document.getElementById('tp-ctr').textContent=`${n?ANIM.cur+1:0} / ${n}`;}
const ICO_PLAY='<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l11 7-11 7z"/></svg>';
const ICO_PAUSE='<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5h3v14H8zM14 5h3v14h-3z"/></svg>';
let animT=null;
function startPlay(){if(!ANIM.steps.length)return;if(ANIM.cur>=ANIM.steps.length-1)applyStep(0);ANIM.playing=true;const b=document.getElementById('tp-play');b.innerHTML=ICO_PAUSE;b.title='Pause [Space]';sdot.className='sdot run';stxt.textContent='Running\u2026';playNext();}
function stopPlay(){ANIM.playing=false;clearTimeout(animT);const b=document.getElementById('tp-play');b.innerHTML=ICO_PLAY;b.title='Play [Space]';}
function playNext(){if(!ANIM.playing)return;const next=ANIM.cur+1;if(next>=ANIM.steps.length){stopPlay();sdot.className='sdot done';stxt.textContent='Done';return;}applyStep(next);const delays=[40,120,250,420,600,800,1100,1500,2000,2500];animT=setTimeout(playNext,delays[Math.max(0,Math.min(9,10-ANIM.speed))]);}
const togglePlay=()=>{ANIM.playing?stopPlay():startPlay();};
document.getElementById('tp-play').onclick=togglePlay;
document.getElementById('tp-first').onclick=()=>{stopPlay();applyStep(0);};
document.getElementById('tp-prev').onclick=()=>{stopPlay();applyStep(ANIM.cur-1);};
document.getElementById('tp-next').onclick=()=>{stopPlay();applyStep(ANIM.cur+1);};
document.getElementById('tp-last').onclick=()=>{stopPlay();applyStep(ANIM.steps.length-1);};
document.getElementById('tp-seek').oninput=e=>{stopPlay();applyStep(parseInt(e.target.value)||0);};
document.getElementById('tp-close').onclick=resetAnim;
function resetAnim(){stopPlay();ANIM.steps=[];ANIM.cur=-1;ANIM.nC={};ANIM.eC={};legend.classList.remove('show');legend.innerHTML='';document.getElementById('transport').classList.add('gone');clearRunLog();updTransport();sdot.className='sdot';stxt.textContent='Ready';rval.textContent='\u2014';rsub.textContent='';invalidate();}
/* textContent, not innerHTML \u2014 node labels are user-supplied and end up in messages. */
function addLog(n,msg,t='',isRun=false){const d=document.createElement('div');d.className='log-row'+(isRun?' run-row':'');const a=document.createElement('span');a.className='log-n';a.textContent=typeof n==='number'?n+'.':n;const b=document.createElement('span');b.className='log-t '+t;b.textContent=msg;d.append(a,b);outLog.appendChild(d);if(!isRun)outLog.scrollTop=outLog.scrollHeight;return d;}
document.getElementById('btn-clr-out').onclick=()=>{outLog.innerHTML='';stepRows=[];rval.textContent='\u2014';rsub.textContent='';toast('Log cleared');};
document.getElementById('btn-cpy-out').onclick=()=>{const txt=[...outLog.querySelectorAll('.log-t')].map(e=>e.textContent).join('\n');navigator.clipboard.writeText(txt).then(()=>toast('Copied!','ok'));};
const ST=(nC,eC,msg,t,rv,rs)=>({nC:{...nC},eC:{...eC},msg,t:t||'',rv,rs});
function aBFS(sid){if(!gn(sid))return null;const steps=[],vis=new Set([sid]),q=[sid],ord=[],nC={},eC={};nC[sid]='start';steps.push(ST(nC,eC,`BFS from ${nlbl(gn(sid))}`,'hl'));while(q.length){const u=q.shift();ord.push(u);nC[u]=nC[u]==='start'?'start':'curr';steps.push(ST(nC,eC,`Processing ${nlbl(gn(u))}`,'',`Order: ${ord.map(id=>nlbl(gn(id))).join(' \u2192 ')}`));for(const{node:v,edge:e}of nbrs(u)){if(!vis.has(v)){vis.add(v);q.push(v);nC[v]='queue';eC[e.id]='tree';steps.push(ST(nC,eC,`Discovered ${nlbl(gn(v))}`));}else if(!eC[e.id])eC[e.id]='cross';}nC[u]='vis';steps.push(ST(nC,eC,`Done ${nlbl(gn(u))}`));}return{steps,nC:{...nC},eC:{...eC},msg:`BFS done. Visited ${vis.size}/${G.nodes.length}.`,rv:`Order: ${ord.map(id=>nlbl(gn(id))).join(' \u2192 ')}`,rs:`${vis.size} nodes`};}
function aDFS(sid){if(!gn(sid))return null;const steps=[],vis=new Set(),nC={},eC={},ord=[],par={};nC[sid]='start';function dfs(u){vis.add(u);ord.push(u);nC[u]=nC[u]==='start'?'start':'curr';steps.push(ST(nC,eC,`DFS visit ${nlbl(gn(u))}`,'',`Order: ${ord.map(id=>nlbl(gn(id))).join(' \u2192 ')}`));for(const{node:v,edge:e}of nbrs(u)){if(!vis.has(v)){par[v]=u;nC[v]='queue';eC[e.id]='tree';steps.push(ST(nC,eC,`Tree edge \u2192 ${nlbl(gn(v))}`));dfs(v);}else if(v!==par[u]&&!eC[e.id]){eC[e.id]='back';steps.push(ST(nC,eC,`Back edge \u2192 ${nlbl(gn(v))}`,'warn'));}}nC[u]='vis';steps.push(ST(nC,eC,`Done ${nlbl(gn(u))}`));}dfs(sid);return{steps,nC:{...nC},eC:{...eC},msg:`DFS done. Visited ${vis.size}/${G.nodes.length}.`,rv:`Order: ${ord.map(id=>nlbl(gn(id))).join(' \u2192 ')}`,rs:`${vis.size} nodes`};}
function aDijkstra(sid,did){if(!gn(sid))return null;const steps=[],dist={},prev={},vis=new Set(),nC={},eC={};G.nodes.forEach(n=>{dist[n.id]=Infinity;prev[n.id]=null;});dist[sid]=0;nC[sid]='start';if(did&&gn(did))nC[did]='end';const pq=[{id:sid,d:0}];while(pq.length){pq.sort((a,b)=>a.d-b.d);const{id:u,d}=pq.shift();if(vis.has(u))continue;vis.add(u);if(nC[u]!=='start'&&nC[u]!=='end')nC[u]='curr';const ds=G.nodes.map(n=>`${nlbl(n)}:${dist[n.id]===Infinity?'\u221e':dist[n.id]}`).join('  ');steps.push(ST(nC,eC,`Process ${nlbl(gn(u))} [d=${d}]`,'',ds));if(u===did){let c=did;while(prev[c]!==null){const pe=prev[c];const ee=G.edges.find(e=>(e.from===pe&&e.to===c)||(!G.directed&&e.from===c&&e.to===pe));if(ee)eC[ee.id]='path';nC[c]='path';c=pe;}nC[c]='start';const path=[];let x=did;while(x!==null){path.unshift(nlbl(gn(x)));x=prev[x];}steps.push(ST(nC,eC,`Path found! dist=${dist[did]}`,'ok',path.join(' \u2192 '),`Distance: ${dist[did]}`));break;}for(const{node:v,edge:e,w}of nbrs(u)){if(vis.has(v))continue;const nd=d+w;if(nd<dist[v]){dist[v]=nd;prev[v]=u;pq.push({id:v,d:nd});if(nC[v]!=='end')nC[v]='queue';eC[e.id]='hl';steps.push(ST(nC,eC,`Relax ${nlbl(gn(u))}\u2192${nlbl(gn(v))}=${nd}`));}}if(nC[u]==='curr')nC[u]='vis';}const allDist=G.nodes.map(n=>`${nlbl(n)}: ${dist[n.id]===Infinity?'\u221e':dist[n.id]}`).join(', ');return{steps,nC:{...nC},eC:{...eC},msg:'Dijkstra complete.',rv:did?`To ${nlbl(gn(did))}: ${dist[did]===Infinity?'\u221e':dist[did]}`:'All shortest paths',rs:did?'':allDist};}
function aBellman(sid){const steps=[],dist={},prev={},nC={},eC={};G.nodes.forEach(n=>{dist[n.id]=Infinity;prev[n.id]=null;});dist[sid]=0;nC[sid]='start';steps.push(ST(nC,eC,`Bellman-Ford from ${nlbl(gn(sid))}`,'hl'));const alledges=[...G.edges];if(!G.directed)alledges.push(...G.edges.map(e=>({...e,from:e.to,to:e.from})));for(let iter=0;iter<G.nodes.length-1;iter++){let changed=false;for(const e of alledges){const w=e.weight??G.defWt;if(dist[e.from]!==Infinity&&dist[e.from]+w<dist[e.to]){dist[e.to]=dist[e.from]+w;prev[e.to]=e.from;changed=true;eC[e.id]='path';if(nC[e.to]!=='start')nC[e.to]='queue';const ds=G.nodes.map(n=>`${nlbl(n)}:${dist[n.id]===Infinity?'\u221e':dist[n.id]}`).join('  ');steps.push(ST(nC,eC,`Iter${iter+1}: ${nlbl(gn(e.from))}\u2192${nlbl(gn(e.to))}=${dist[e.to]}`,'',ds));}}if(!changed)break;}let hasNeg=false;for(const e of alledges){const w=e.weight??G.defWt;if(dist[e.from]!==Infinity&&dist[e.from]+w<dist[e.to]){hasNeg=true;eC[e.id]='brd';steps.push(ST(nC,eC,'\u26a0 Negative cycle!','warn'));}}G.nodes.forEach(n=>{if(nC[n.id]==='queue')nC[n.id]='vis';});const allDist=G.nodes.map(n=>`${nlbl(n)}: ${dist[n.id]===Infinity?'\u221e':dist[n.id]}`).join(', ');return{steps,nC:{...nC},eC:{...eC},msg:hasNeg?'Negative cycle found!':'Bellman-Ford done.',rv:hasNeg?'\u2717 Neg Cycle':'All Distances',rs:allDist};}
function aFloyd(){const steps=[],n=G.nodes.length;const ids=G.nodes.map(x=>x.id);const idx={};ids.forEach((id,i)=>idx[id]=i);const INF=1e9;const dist=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?0:INF));for(const e of G.edges){const i=idx[e.from],j=idx[e.to],w=e.weight??G.defWt;if(w<dist[i][j])dist[i][j]=w;if(!G.directed&&w<dist[j][i])dist[j][i]=w;}for(let k=0;k<n;k++){const nC2={[ids[k]]:'curr'};steps.push(ST(nC2,{},`Intermediate: ${nlbl(G.nodes[k])} (${k+1}/${n})`));for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(dist[i][k]!==INF&&dist[k][j]!==INF&&dist[i][k]+dist[k][j]<dist[i][j])dist[i][j]=dist[i][k]+dist[k][j];}return{steps,nC:{},eC:{},msg:'Floyd-Warshall done.',rv:'All-Pairs SP',rs:'Matrix computed'};}
class UF{constructor(ids){this.p={};this.r={};ids.forEach(id=>{this.p[id]=id;this.r[id]=0;});}find(x){if(this.p[x]!==x)this.p[x]=this.find(this.p[x]);return this.p[x];}union(x,y){const px=this.find(x),py=this.find(y);if(px===py)return false;if(this.r[px]<this.r[py])this.p[px]=py;else if(this.r[px]>this.r[py])this.p[py]=px;else{this.p[py]=px;this.r[px]++;}return true;}}
function aKruskal(){const steps=[],nC={},eC={};const edges=[...G.edges].sort((a,b)=>(a.weight??G.defWt)-(b.weight??G.defWt));const uf=new UF(G.nodes.map(n=>n.id));let tot=0,me=0;steps.push(ST({},{},'Kruskal: edges sorted by weight'));for(const e of edges){eC[e.id]='cons';steps.push(ST(nC,eC,`Consider (${nlbl(gn(e.from))},${nlbl(gn(e.to))}) w=${e.weight??G.defWt}`,'',`MST wt: ${tot}`));if(uf.union(e.from,e.to)){me++;tot+=e.weight??G.defWt;eC[e.id]='mst';nC[e.from]='mst';nC[e.to]='mst';steps.push(ST(nC,eC,`\u2713 Added! MST wt=${tot}`,'ok',`MST Weight: ${tot}`,`${me} edges`));}else{eC[e.id]='rej';steps.push(ST(nC,eC,'\u2717 Rejected (creates cycle)'));}}return{steps,nC:{...nC},eC:{...eC},msg:`Kruskal done. MST wt=${tot}.`,rv:`MST Weight: ${tot}`,rs:`${me} edge(s)`};}
function aPrim(sid){const steps=[],nC={},eC={},inMST=new Set(),dist={},prevE={};const INF=1e9;G.nodes.forEach(n=>dist[n.id]=INF);dist[sid]=0;nC[sid]='start';steps.push(ST(nC,eC,`Prim from ${nlbl(gn(sid))}`));let tot=0,me=0;for(let iter=0;iter<G.nodes.length;iter++){let u=null,mn=INF;for(const n of G.nodes)if(!inMST.has(n.id)&&dist[n.id]<mn){mn=dist[n.id];u=n.id;}if(u===null)break;inMST.add(u);if(prevE[u]){eC[prevE[u]]='mst';tot+=mn;me++;}nC[u]='mst';steps.push(ST(nC,eC,`Added ${nlbl(gn(u))} (w=${mn===0?0:mn})`,'ok',`MST wt: ${tot}`,`${me} edges`));for(const{node:v,edge:e,w}of nbrs(u)){if(!inMST.has(v)&&w<dist[v]){dist[v]=w;prevE[v]=e.id;if(nC[v]!=='mst')nC[v]='queue';eC[e.id]='hl';steps.push(ST(nC,eC,`Key[${nlbl(gn(v))}]=${w}`));}}}return{steps,nC:{...nC},eC:{...eC},msg:`Prim done. MST wt=${tot}.`,rv:`MST Weight: ${tot}`,rs:`${me} edge(s)`};}
function aBridges(){const steps=[],nC={},eC={},vis=new Set(),disc={},low={},parEdge={};let timer=0;const bridges=[];function dfs(u){vis.add(u);disc[u]=low[u]=++timer;nC[u]='curr';steps.push(ST(nC,eC,`Visit ${nlbl(gn(u))} [disc=${disc[u]}]`));for(const{node:v,edge:e}of nbrs(u)){if(!vis.has(v)){parEdge[v]=e.id;eC[e.id]='tree';dfs(v);low[u]=Math.min(low[u],low[v]);if(low[v]>disc[u]){bridges.push(e);eC[e.id]='brd';nC[u]='brd';nC[v]='brd';steps.push(ST(nC,eC,`\ud83c\udf09 BRIDGE (${nlbl(gn(u))},${nlbl(gn(v))})  low[v]=${low[v]}>disc[u]=${disc[u]}`,'warn',`Bridges: ${bridges.length}`));}}else if(e.id!==parEdge[u]){low[u]=Math.min(low[u],disc[v]);if(!eC[e.id])eC[e.id]='back';}}if(nC[u]!=='brd')nC[u]='vis';steps.push(ST(nC,eC,`Done ${nlbl(gn(u))} [low=${low[u]}]`));}for(const n of G.nodes)if(!vis.has(n.id)){parEdge[n.id]=undefined;dfs(n.id);}return{steps,nC:{...nC},eC:{...eC},msg:`Found ${bridges.length} bridge(s).`,rv:bridges.length?`${bridges.length} bridge(s)`:'No Bridges',rs:bridges.map(e=>`(${nlbl(gn(e.from))},${nlbl(gn(e.to))})`).join(', ')};}
function aArtic(){const steps=[],nC={},eC={},vis=new Set(),disc={},low={},parEdge={},aps=new Set();let timer=0;function dfs(u, pEdge){vis.add(u);disc[u]=low[u]=++timer;let ch=0;nC[u]='curr';steps.push(ST(nC,eC,`Visit ${nlbl(gn(u))} [disc=${disc[u]}]`));for(const{node:v,edge:e}of nbrs(u)){if(!vis.has(v)){ch++;parEdge[v]=e.id;eC[e.id]='tree';dfs(v, e.id);low[u]=Math.min(low[u],low[v]);if((pEdge===undefined&&ch>1)||(pEdge!==undefined&&low[v]>=disc[u])){aps.add(u);nC[u]='ap';steps.push(ST(nC,eC,`\u2b21 AP: ${nlbl(gn(u))}`,'warn',`APs: ${aps.size}`));}}else if(e.id!==pEdge){low[u]=Math.min(low[u],disc[v]);if(!eC[e.id])eC[e.id]='back';}}if(!aps.has(u))nC[u]='vis';steps.push(ST(nC,eC,`Done ${nlbl(gn(u))}`));}for(const n of G.nodes)if(!vis.has(n.id)){dfs(n.id, undefined);}return{steps,nC:{...nC},eC:{...eC},msg:`Found ${aps.size} AP(s).`,rv:aps.size?`${aps.size} AP(s)`:'No APs',rs:[...aps].map(id=>nlbl(gn(id))).join(', ')};}
function aSCC(){const steps=[],nC={},eC={},vis1=new Set(),order=[];function dfs1(u){vis1.add(u);nC[u]='curr';steps.push(ST(nC,eC,`Phase 1: ${nlbl(gn(u))}`));for(const{node:v}of nbrs(u))if(!vis1.has(v))dfs1(v);order.push(u);nC[u]='vis';}for(const n of G.nodes)if(!vis1.has(n.id))dfs1(n.id);steps.push(ST({...nC},{},`Phase 1 done. Order: ${order.map(id=>nlbl(gn(id))).join('\u2192')}`,'hl'));Object.keys(nC).forEach(k=>delete nC[k]);const vis2=new Set(),comps=[];function dfs2(u,ci,comp){vis2.add(u);nC[u]='scc'+ci;comp.push(u);steps.push(ST(nC,eC,`SCC${ci+1}: ${nlbl(gn(u))}`));for(const{node:v}of revNbrs(u))if(!vis2.has(v))dfs2(v,ci,comp);}for(let i=order.length-1;i>=0;i--){const u=order[i];if(!vis2.has(u)){const comp=[];comps.push(comp);dfs2(u,comps.length-1,comp);}}return{steps,nC:{...nC},eC:{...eC},msg:`Found ${comps.length} SCC(s).`,rv:`${comps.length} SCC(s)`,rs:comps.map((c,i)=>`SCC${i+1}:{${c.map(id=>nlbl(gn(id))).join(',')}}`).join(' | ')};}
function aBipartite(){const steps=[],nC={},eC={},col={};let isBp=true;for(const start of G.nodes){if(col[start.id]!==undefined)continue;const q=[start.id];col[start.id]=0;nC[start.id]='bpA';while(q.length){const u=q.shift();nC[u]=col[u]===0?'bpA':'bpB';steps.push(ST(nC,eC,`Color ${nlbl(gn(u))} \u2192 Group ${col[u]===0?'A':'B'}`));for(const{node:v,edge:e}of nbrs(u)){if(col[v]===undefined){col[v]=1-col[u];q.push(v);nC[v]=col[v]===0?'bpA':'bpB';eC[e.id]='tree';}else if(col[v]===col[u]){isBp=false;eC[e.id]='brd';steps.push(ST(nC,eC,`\u26a0 Conflict! ${nlbl(gn(u))},${nlbl(gn(v))} same group`,'warn'));}else if(!eC[e.id])eC[e.id]='cross';}}}return{steps,nC:{...nC},eC:{...eC},msg:isBp?'Graph IS bipartite.':'NOT bipartite.',rv:isBp?'\u2713 Bipartite':'\u2717 Not Bipartite',rs:isBp?'2-colorable':'Odd cycle exists'};}
function aTopo(){if(!G.directed){toast('Topo sort requires a directed graph','err');return null;}const steps=[],nC={},eC={},inD={};G.nodes.forEach(n=>inD[n.id]=0);G.edges.forEach(e=>inD[e.to]=(inD[e.to]||0)+1);const q=G.nodes.filter(n=>inD[n.id]===0).map(n=>n.id);q.forEach(id=>nC[id]='start');steps.push(ST(nC,eC,`Sources: [${q.map(id=>nlbl(gn(id))).join(', ')}]`,'hl'));const ord=[];while(q.length){q.sort((a,b)=>a-b);const u=q.shift();ord.push(u);nC[u]='curr';steps.push(ST(nC,eC,`Process ${nlbl(gn(u))}`,'',`Order: ${ord.map(id=>nlbl(gn(id))).join(' \u2192 ')}`));for(const{node:v,edge:e}of nbrs(u)){inD[v]--;eC[e.id]='path';if(inD[v]===0){q.push(v);nC[v]='queue';steps.push(ST(nC,eC,`${nlbl(gn(v))} in-deg\u21920`));}}nC[u]='vis';}const cyc=ord.length<G.nodes.length;return{steps,nC:{...nC},eC:{...eC},msg:cyc?'\u26a0 Graph has cycle!':'Topo sort done.',rv:cyc?'\u2717 Not a DAG':`${ord.map(id=>nlbl(gn(id))).join(' \u2192 ')}`,rs:cyc?'':`${ord.length} nodes`};}
function aEuler(){const steps=[],nC={},eC={};if(G.directed){const outD={},inD={};G.nodes.forEach(n=>{outD[n.id]=0;inD[n.id]=0;});G.edges.forEach(e=>{outD[e.from]++;inD[e.to]++;});if(!G.nodes.every(n=>outD[n.id]===inD[n.id])){steps.push(ST({},{},'\u26a0 in-deg\u2260out-deg: no Euler circuit','warn'));return{steps,msg:'No Euler circuit.',rv:'\u2717 No Euler Circuit'};}}else{const deg={};G.nodes.forEach(n=>deg[n.id]=0);G.edges.forEach(e=>{deg[e.from]++;deg[e.to]++;});const odd=G.nodes.filter(n=>deg[n.id]%2);if(odd.length){steps.push(ST({},{},`\u26a0 ${odd.length} odd-degree nodes`,'warn'));return{steps,msg:'No Euler circuit.',rv:'\u2717 No Euler Circuit',rs:`Odd: ${odd.map(n=>nlbl(n)).join(', ')}`};}}const used=new Set(),sid=G.nodes[0]?.id,stack=[sid],path=[];while(stack.length){const v=stack[stack.length-1];const fe=G.edges.find(e=>!used.has(e.id)&&(e.from===v||(!G.directed&&e.to===v)));if(fe){used.add(fe.id);const nx=fe.from===v?fe.to:fe.from;eC[fe.id]='path';nC[v]='curr';steps.push(ST(nC,eC,`Traverse ${nlbl(gn(v))}\u2192${nlbl(gn(nx))}`));stack.push(nx);}else path.push(stack.pop());}return{steps,nC:{...nC},eC:{...eC},msg:`Euler circuit! ${path.length-1} edges.`,rv:'Euler Circuit',rs:path.map(id=>nlbl(gn(id))).join(' \u2192 ')};}
document.getElementById('btn-parse').onclick=parseEL;
document.getElementById('btn-el-clear').onclick=()=>document.getElementById('el-in').value='';
let liveT=null;
document.getElementById('el-in').addEventListener('input',()=>{if(document.getElementById('sw-live').classList.contains('on')){clearTimeout(liveT);liveT=setTimeout(parseEL,380);}});
document.getElementById('sw-live').onclick=()=>{const el=document.getElementById('sw-live');setSw(el,!el.classList.contains('on'));};
function parseEL(){const txt=document.getElementById('el-in').value.trim();if(!txt)return;const lines=txt.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')&&!l.startsWith('//'));if(!lines.length)return;const fp=lines[0].split(/\s+/);let si=0;if(fp.length===2&&fp.every(x=>!isNaN(parseInt(x)))&&parseInt(fp[1])===lines.length-1)si=1;let isWt=false;for(let i=si;i<lines.length;i++){const p=lines[i].split(/\s+/);if(p.length>=3&&!isNaN(parseFloat(p[2]))){isWt=true;break;}}saveH();G.nodes=[];G.edges=[];G.nc=0;G.ec=0;const ns=new Set(),ed=[];for(let i=si;i<lines.length;i++){const p=lines[i].split(/\s+/);if(p.length<2)continue;const u=parseInt(p[0]),v=parseInt(p[1]),w=p.length>=3?parseFloat(p[2]):G.defWt;if(isNaN(u)||isNaN(v))continue;ns.add(u);ns.add(v);ed.push({u,v,w});}const ids=[...ns].sort((a,b)=>a-b);const n=ids.length;const nMap=new Map();ids.forEach((num,i)=>{const a=n<=1?0:(i/n*Math.PI*2-Math.PI/2);const r=Math.max(90,n*22);const nd={id:nid(),label:String(num),x:n<=1?0:Math.cos(a)*r,y:n<=1?0:Math.sin(a)*r};G.nodes.push(nd);nMap.set(num,nd.id);});ed.forEach(({u,v,w})=>G.edges.push({id:eid(),from:nMap.get(u),to:nMap.get(v),weight:w}));if(isWt)setWt(true);updStats();updSel();setTimeout(fitView,50);toast(`Parsed ${G.nodes.length}V, ${G.edges.length}E`,'ok');}
document.getElementById('btn-pmat').onclick=()=>{const txt=document.getElementById('mat-in').value.trim();if(!txt)return;const rows=txt.split('\n').map(r=>r.trim().split(/\s+/).map(Number));const n=rows.length;if(rows.some(r=>r.length!==n)){toast('Matrix must be square','err');return;}saveH();G.nodes=[];G.edges=[];G.nc=0;G.ec=0;const r2=Math.max(90,n*28);for(let i=0;i<n;i++){const a=i/n*Math.PI*2-Math.PI/2;G.nodes.push({id:nid(),x:Math.cos(a)*r2,y:Math.sin(a)*r2});}for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=rows[i][j];if(v&&!isNaN(v)&&(G.directed||i<j))G.edges.push({id:eid(),from:G.nodes[i].id,to:G.nodes[j].id,weight:v});}updStats();updSel();setTimeout(fitView,50);toast(`Parsed ${n}\u00d7${n} matrix`,'ok');};
function expEL(){const h=`${G.nodes.length} ${G.edges.length}`;const body=G.edges.map(e=>{const u=nlbl(gn(e.from)),v=nlbl(gn(e.to));return G.weighted?`${u} ${v} ${e.weight??G.defWt}`:`${u} ${v}`;}).join('\n');return h+'\n'+body;}
function expAM(){const n=G.nodes.length;const ii={};G.nodes.forEach((nd,i)=>ii[nd.id]=i);const mat=Array.from({length:n},()=>Array(n).fill(0));G.edges.forEach(e=>{const i=ii[e.from],j=ii[e.to],w=G.weighted?e.weight??G.defWt:1;mat[i][j]=w;if(!G.directed)mat[j][i]=w;});return mat.map(r=>r.join(' ')).join('\n');}
function expCPP(){const adj={};G.nodes.forEach(n=>adj[n.id]=[]);G.edges.forEach(e=>{adj[e.from].push({to:e.to,w:e.weight??G.defWt});if(!G.directed)adj[e.to].push({to:e.from,w:e.weight??G.defWt});});const N=G.nodes.length;let c=`// n=${N}, m=${G.edges.length}, ${G.directed?'directed':'undirected'}, ${G.weighted?'weighted':'unweighted'}\n`;c+=G.weighted?`vector<pair<int,int>> adj[${N+G.nodeStart}]; // {to, weight}\n\n`:`vector<int> adj[${N+G.nodeStart}];\n\n`;G.nodes.forEach(nd=>{adj[nd.id].forEach(({to,w})=>{c+=G.weighted?`adj[${nlbl(nd)}].push_back({${nlbl(gn(to))},${w}});\n`:`adj[${nlbl(nd)}].push_back(${nlbl(gn(to))});\n`;});});return c;}
function expPY(){const adj={};G.nodes.forEach(n=>adj[nlbl(n)]=[]);G.edges.forEach(e=>{const u=nlbl(gn(e.from)),v=nlbl(gn(e.to)),w=e.weight??G.defWt;if(G.weighted){adj[u].push(`(${v},${w})`);if(!G.directed)adj[v].push(`(${u},${w})`);}else{adj[u].push(v);if(!G.directed)adj[v].push(u);}});let c='# n='+G.nodes.length+', m='+G.edges.length+'\nadj = {\n';Object.entries(adj).forEach(([k,vs])=>{c+=`    ${k}: [${vs.join(', ')}],\n`;});return c+'}';}
function expDOT(){const tp=G.directed?'digraph':'graph',ar=G.directed?'->':'--';let d=`${tp} G {\n  rankdir=LR;\n  node [shape=circle style=filled fillcolor="#1e2d45" fontcolor=white color="#3b5275"];\n`;G.nodes.forEach(n=>d+=`  ${nlbl(n)};\n`);G.edges.forEach(e=>{let l=`  ${nlbl(gn(e.from))} ${ar} ${nlbl(gn(e.to))}`;if(G.weighted)l+=` [label="${e.weight??G.defWt}"]`;d+=l+';\n';});return d+'}';}
function expJSON(){return JSON.stringify({directed:G.directed,weighted:G.weighted,nodes:G.nodes.map(n=>({id:nlbl(n),x:Math.round(n.x),y:Math.round(n.y)})),edges:G.edges.map(e=>Object.assign({from:nlbl(gn(e.from)),to:nlbl(gn(e.to))},G.weighted?{w:e.weight??G.defWt}:{}))},null,2);}
document.querySelectorAll('.exp-copy').forEach(btn=>{btn.addEventListener('click',()=>{const t=btn.dataset.exp;if(!G.nodes.length){toast('Graph is empty \u2014 nothing to export','err');return;}if(t==='png'){expPNG();return;}const fns={el:expEL,am:expAM,cpp:expCPP,py:expPY,dot:expDOT,json:expJSON};const txt=(fns[t]||(()=>''))();navigator.clipboard.writeText(txt).then(()=>{toast('Copied to clipboard','ok');btn.textContent='\u2713';setTimeout(()=>btn.textContent='Copy',1600);}).catch(()=>toast('Clipboard blocked by the browser','err'));});});
/* Renders the whole graph to an offscreen canvas at 2x instead of screenshotting
   the viewport, so nothing off-screen gets clipped out of the export. */
function expPNG(){const pad=56,sc=2;const xs=G.nodes.map(n=>n.x),ys=G.nodes.map(n=>n.y);const minX=Math.min(...xs)-pad-NR,maxX=Math.max(...xs)+pad+NR,minY=Math.min(...ys)-pad-NR,maxY=Math.max(...ys)+pad+NR;const w=Math.max(1,Math.ceil(maxX-minX)),h=Math.max(1,Math.ceil(maxY-minY));const off=document.createElement('canvas');off.width=w*sc;off.height=h*sc;const sv={ctx,z:UI.zoom,px:UI.panX,py:UI.panY,vw:VW,vh:VH,hn:UI.hovNode,he:UI.hovEdge,sn:UI.selNode,se:UI.selEdge,es:UI.edgeSrc};let url='';try{ctx=off.getContext('2d');UI.zoom=sc;UI.panX=-minX*sc;UI.panY=-minY*sc;VW=off.width;VH=off.height;UI.hovNode=UI.hovEdge=UI.selNode=UI.selEdge=UI.edgeSrc=null;ctx.setTransform(1,0,0,1,0,0);drawScene();url=off.toDataURL('image/png');}finally{ctx=sv.ctx;UI.zoom=sv.z;UI.panX=sv.px;UI.panY=sv.py;VW=sv.vw;VH=sv.vh;UI.hovNode=sv.hn;UI.hovEdge=sv.he;UI.selNode=sv.sn;UI.selEdge=sv.se;UI.edgeSrc=sv.es;invalidate();}const link=document.createElement('a');link.download='graph.png';link.href=url;link.click();toast('PNG saved \u2014 whole graph @2x','ok');}
function openModal(title,body){document.getElementById('modal-t').textContent=title;document.getElementById('modal-b').innerHTML=body;document.getElementById('overlay').classList.add('show');}
function closeModal(){document.getElementById('overlay').classList.remove('show');}
document.getElementById('modal-x').onclick=closeModal;
document.getElementById('overlay').addEventListener('click',e=>{if(e.target===document.getElementById('overlay'))closeModal();});
const SC_ROWS=[['Select / Move','<kbd>V</kbd>'],['Add Node','<kbd>N</kbd>'],['Add Edge','<kbd>E</kbd>'],['Delete Mode','<kbd>Del</kbd> / <kbd>Backspace</kbd>'],['Quick add node','Double-click canvas'],['Edit label','Double-click node'],['Context menu','Right-click'],['Undo / Redo','<kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd>'],['Fit view','<kbd>F</kbd>'],['Toggle water drop','<kbd>B</kbd>'],['Cycle panel corner','<kbd>C</kbd>'],['Zoom','Scroll wheel'],['Pan','Drag empty canvas, or middle-drag'],['Pan horizontally','<kbd>Shift</kbd> + scroll'],['Play / pause animation','<kbd>Space</kbd>'],['Step animation','<kbd>&larr;</kbd> / <kbd>&rarr;</kbd>'],['Jump to first / last step','<kbd>Home</kbd> / <kbd>End</kbd>'],['Cancel / close','<kbd>Esc</kbd>'],['This dialog','<kbd>?</kbd>']];
function showSC(){openModal('Keyboard Shortcuts','<table class="sct"><thead><tr><th>Action</th><th>Key</th></tr></thead><tbody>'+SC_ROWS.map(([a,k])=>`<tr><td>${a}</td><td>${k}</td></tr>`).join('')+'</tbody></table>');}
document.getElementById('btn-sc').onclick=showSC;
document.addEventListener('keydown',e=>{
  const overlayOpen=document.getElementById('overlay').classList.contains('show');
  if(e.key==='Escape'&&overlayOpen){closeModal();return;}
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||overlayOpen)return;
  const ctrl=e.ctrlKey||e.metaKey;
  if(ctrl&&(e.key==='z'||e.key==='Z')&&!e.shiftKey){e.preventDefault();undo();return;}
  if(ctrl&&(e.key==='y'||e.key==='Y'||(e.shiftKey&&(e.key==='Z'||e.key==='z')))){e.preventDefault();redo();return;}
  if(ctrl)return;
  if(ANIM.steps.length){/* transport keys take priority while an animation is loaded */
    if(e.key===' '){e.preventDefault();togglePlay();return;}
    if(e.key==='ArrowLeft'){e.preventDefault();stopPlay();applyStep(ANIM.cur-1);return;}
    if(e.key==='ArrowRight'){e.preventDefault();stopPlay();applyStep(ANIM.cur+1);return;}
    if(e.key==='Home'){e.preventDefault();stopPlay();applyStep(0);return;}
    if(e.key==='End'){e.preventDefault();stopPlay();applyStep(ANIM.steps.length-1);return;}
  }
  const k=e.key.toLowerCase();
  if(k==='v')setMode('select');
  else if(k==='n')setMode('addNode');
  else if(k==='e')setMode('addEdge');
  else if(k==='f')fitView();
  else if(e.key==='?')showSC();
  else if(e.key==='Delete'||e.key==='Backspace'){if(UI.selNode){delNode(UI.selNode);return;}if(UI.selEdge){delEdge(UI.selEdge);return;}setMode('delete');}
  else if(e.key==='Escape'){hideCtx();hideWtip();UI.edgeSrc=null;desel();setMode('select');}
});
/* Panel drag/snap/bubble and the output footer are handled by the two
   controllers appended at the bottom of this file. */
/* ---------- empty-state shortcuts ---------- */
document.getElementById('e-tmpl').onclick=()=>{switchTab('settings');document.getElementById('tmpl-grid').scrollIntoView({block:'center',behavior:'smooth'});};
document.getElementById('e-paste').onclick=()=>{switchTab('io');const t=document.getElementById('el-in');t.focus();t.scrollIntoView({block:'center'});};
document.getElementById('tmpl-grid').addEventListener('keydown',e=>{const it=e.target.closest('.tmpl-item');if(it&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showTmpl(it.dataset.t);}});
new ResizeObserver(()=>resize()).observe(document.getElementById('cw'));
function init(){
  resize();setMode('select');setSpeed(5);updTransport();
  const restored=restore();
  if(!restored){UI.panX=VW/2;UI.panY=VH/2;updStats();updSel();}
  requestAnimationFrame(render);
  addLog('\u2192','Welcome to GraphCP \u2014 the graph editor for competitive programming.','hl');
  addLog('\u2192','Press N to add nodes, E to draw edges, V to select and move.');
  addLog('\u2192','Right-click a node or edge for its context menu. Scroll to zoom, drag to pan.');
  addLog('\u2192','Paste edge lists in the I/O tab. Press ? for all shortcuts.');
  if(restored){toast('Restored your previous graph','ok');addLog('\u2192',`Restored ${G.nodes.length} node(s) and ${G.edges.length} edge(s) from your last session.`,'ok');}
}
init();

/* ══════════════════════════════════════════════════════════════
   FLOATING PANEL & ULTRA-REALISTIC 3D WATER DROP CONTROLLER
   ══════════════════════════════════════════════════════════════ */
(function initFloatingSidebar() {
  const SNAP_GAP     = 16;
  const TOP_GAP      = 60;
  const SNAP_ZONE    = 0.35;
  const DRAG_THRESH  = 6;
  const MORPH_DUR    = 440;
  const CORNERS      = ['TR', 'TL', 'BL', 'BR'];

  const panel          = document.getElementById('sidebar');
  const dragHandle     = document.getElementById('drag-handle');
  const bubble         = document.getElementById('bubble');
  const cornerBadge    = document.getElementById('corner-badge');
  const btnExpandWidth = document.getElementById('btn-expand-width');
  const btnCornerCycle = document.getElementById('btn-corner-cycle');
  const btnBubble      = document.getElementById('btn-bubble');
  const resizeW        = document.getElementById('resize-w');
  const resizeE        = document.getElementById('resize-e');
  const resizeS        = document.getElementById('resize-s');
  const resizeSW       = document.getElementById('resize-sw');
  const resizeSE       = document.getElementById('resize-se');

  const pState = {
    corner:   'TR',
    isBubble: false,
    panelW:   290,
    panelH:   null,
    morphing: false
  };

  function forceReflow(el) { void el.offsetHeight; }
  function panelRect() { return panel.getBoundingClientRect(); }
  function vp() { return { w: window.innerWidth, h: window.innerHeight }; }

  function snapToCorner(corner) {
    panel.style.left   = '';
    panel.style.right  = '';
    panel.style.top    = '';
    panel.style.bottom = '';

    switch (corner) {
      case 'TR':
        panel.style.right = SNAP_GAP + 'px';
        panel.style.top   = TOP_GAP + 'px';
        break;
      case 'TL':
        panel.style.left = SNAP_GAP + 'px';
        panel.style.top  = TOP_GAP + 'px';
        break;
      case 'BL':
        panel.style.left   = SNAP_GAP + 'px';
        panel.style.bottom = SNAP_GAP + 'px';
        break;
      case 'BR':
        panel.style.right  = SNAP_GAP + 'px';
        panel.style.bottom = SNAP_GAP + 'px';
        break;
    }

    pState.corner = corner;
    panel.dataset.corner = corner;
    updateCornerBadge();
    updateBubbleCorner();
  }

  function updateCornerBadge() {
    if (!cornerBadge) return;
    cornerBadge.textContent = pState.corner;
    cornerBadge.classList.add('active');
    cornerBadge.style.transform = 'scale(1.15)';
    setTimeout(() => { cornerBadge.style.transform = ''; }, 250);
  }

  function updateBubbleCorner() {
    if (!bubble) return;
    bubble.style.left   = '';
    bubble.style.right  = '';
    bubble.style.top    = '';
    bubble.style.bottom = '';

    switch (pState.corner) {
      case 'TR': bubble.style.right = SNAP_GAP + 'px'; bubble.style.top    = TOP_GAP + 'px'; break;
      case 'TL': bubble.style.left  = SNAP_GAP + 'px'; bubble.style.top    = TOP_GAP + 'px'; break;
      case 'BL': bubble.style.left  = SNAP_GAP + 'px'; bubble.style.bottom = SNAP_GAP + 'px'; break;
      case 'BR': bubble.style.right = SNAP_GAP + 'px'; bubble.style.bottom = SNAP_GAP + 'px'; break;
    }
  }

  function detectCornerFromCenter() {
    const { w, h } = vp();
    const r = panelRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    const isLeft = cx < w / 2;
    const isTop  = cy < h / 2;
    if ( isLeft &&  isTop) return 'TL';
    if (!isLeft &&  isTop) return 'TR';
    if ( isLeft && !isTop) return 'BL';
    return 'BR';
  }

  function isInSnapZone() {
    const { w, h } = vp();
    const r = panelRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    return (
      cx < w * SNAP_ZONE || cx > w * (1 - SNAP_ZONE) ||
      cy < h * SNAP_ZONE || cy > h * (1 - SNAP_ZONE)
    );
  }

  /* --- Panel Drag --- */
  if (dragHandle) {
    let dragging = false;
    let startX, startY, startL, startT;

    dragHandle.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || pState.isBubble || pState.morphing) return;
      if (e.target.closest('.win-btns')) return;

      dragging = true;
      const r = panelRect();
      startL = r.left;
      startT = r.top;
      startX = e.clientX;
      startY = e.clientY;

      panel.style.transition = 'none';
      panel.style.left   = startL + 'px';
      panel.style.top    = startT + 'px';
      panel.style.right  = '';
      panel.style.bottom = '';

      panel.classList.add('dragging');
      document.body.style.cursor = 'grabbing';
      e.preventDefault();

      function onDragMove(ev) {
        if (!dragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const { w, h } = vp();
        const pr = panelRect();

        const newLeft = Math.max(0, Math.min(w - pr.width,  startL + dx));
        const newTop  = Math.max(0, Math.min(h - pr.height, startT + dy));

        panel.style.left = newLeft + 'px';
        panel.style.top  = newTop  + 'px';
        panel.classList.toggle('snap-preview', isInSnapZone());
      }

      function onDragEnd() {
        if (!dragging) return;
        dragging = false;
        panel.classList.remove('dragging', 'snap-preview');
        document.body.style.cursor = '';
        panel.style.transition = '';

        const corner = detectCornerFromCenter();
        snapToCorner(corner);

        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup',   onDragEnd);
      }

      window.addEventListener('mousemove', onDragMove);
      window.addEventListener('mouseup',   onDragEnd);
    });
  }

  /* --- Bubble Drag & Click --- */
  if (bubble) {
    let dragging  = false;
    let totalDist = 0;
    let startX, startY, startL, startT;

    bubble.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      dragging  = false;
      totalDist = 0;

      const r = bubble.getBoundingClientRect();
      startL = r.left;
      startT = r.top;
      startX = e.clientX;
      startY = e.clientY;

      bubble.style.transition = 'none';
      bubble.style.left   = startL + 'px';
      bubble.style.top    = startT + 'px';
      bubble.style.right  = '';
      bubble.style.bottom = '';
      bubble.style.animationPlayState = 'paused';

      document.body.style.cursor = 'grabbing';
      e.preventDefault();

      function onBubbleMove(ev) {
        totalDist += Math.abs(ev.movementX) + Math.abs(ev.movementY);
        if (totalDist >= DRAG_THRESH) dragging = true;
        if (!dragging) return;

        const { w, h } = vp();
        const br = bubble.getBoundingClientRect();
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        const newLeft = Math.max(0, Math.min(w - br.width,  startL + dx));
        const newTop  = Math.max(0, Math.min(h - br.height, startT + dy));

        bubble.style.left = newLeft + 'px';
        bubble.style.top  = newTop  + 'px';
      }

      function onBubbleUp() {
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onBubbleMove);
        window.removeEventListener('mouseup',   onBubbleUp);
        bubble.style.animationPlayState = '';

        if (totalDist < DRAG_THRESH) {
          expandPanel();
        } else {
          bubble.style.transition = '';
          const { w, h } = vp();
          const br = bubble.getBoundingClientRect();
          const cx = br.left + br.width  / 2;
          const cy = br.top  + br.height / 2;
          const isLeft = cx < w / 2;
          const isTop  = cy < h / 2;

          let corner;
          if ( isLeft &&  isTop) corner = 'TL';
          else if (!isLeft &&  isTop) corner = 'TR';
          else if ( isLeft && !isTop) corner = 'BL';
          else corner = 'BR';

          pState.corner = corner;
          panel.dataset.corner = corner;
          updateCornerBadge();
          updateBubbleCorner();
        }
      }

      window.addEventListener('mousemove', onBubbleMove);
      window.addEventListener('mouseup',   onBubbleUp);
    });
  }

  /* --- Morph Functions --- */
  function collapsePanel() {
    if (pState.morphing || pState.isBubble) return;
    pState.morphing = true;

    const pr = panelRect();
    const pw = pr.width;
    const ph = pr.height;

    panel.style.width   = pw + 'px';
    panel.style.height  = ph + 'px';
    panel.style.left    = pr.left + 'px';
    panel.style.top     = pr.top  + 'px';
    panel.style.right   = '';
    panel.style.bottom  = '';
    panel.style.transition = 'none';

    forceReflow(panel);
    updateBubbleCorner();
    const br = bubble.getBoundingClientRect();

    panel.style.transition = '';

    requestAnimationFrame(() => {
      panel.style.width        = '58px';
      panel.style.height       = '58px';
      panel.style.borderRadius = '50%';
      panel.style.left         = br.left + 'px';
      panel.style.top          = br.top  + 'px';
      panel.style.overflow     = 'hidden';
      panel.style.outline      = 'none';

      setTimeout(() => {
        bubble.classList.add('is-active');
        bubble.style.transform = '';
      }, 80);

      setTimeout(() => {
        panel.classList.add('is-bubble');
        pState.isBubble = true;
        pState.morphing = false;

        panel.style.width        = '';
        panel.style.height       = '';
        panel.style.borderRadius = '';
        panel.style.left         = '';
        panel.style.top          = '';
        panel.style.overflow     = '';
        panel.style.outline      = '';

        snapToCorner(pState.corner);
      }, MORPH_DUR + 40);
    });
  }

  function expandPanel() {
    if (pState.morphing || !pState.isBubble) return;
    pState.morphing = true;

    spawnRipple();
    const br = bubble.getBoundingClientRect();
    bubble.classList.remove('is-active');

    panel.classList.remove('is-bubble');
    panel.style.width        = '58px';
    panel.style.height       = '58px';
    panel.style.borderRadius = '50%';
    panel.style.left         = br.left + 'px';
    panel.style.top          = br.top  + 'px';
    panel.style.right        = '';
    panel.style.bottom       = '';
    panel.style.transition   = 'none';
    panel.style.overflow     = 'hidden';
    panel.style.outline      = 'none';

    forceReflow(panel);

    const targetW = pState.panelW || 290;
    const targetH = pState.panelH ? pState.panelH + 'px' : '';

    panel.style.transition = '';

    requestAnimationFrame(() => {
      panel.style.width        = targetW + 'px';
      panel.style.height       = targetH || '';
      panel.style.borderRadius = '20px';
      panel.style.overflow     = '';
      panel.style.outline      = '';

      snapToCorner(pState.corner);

      setTimeout(() => {
        pState.isBubble = false;
        pState.morphing = false;
        panel.style.width  = '';
        panel.style.height = '';
      }, MORPH_DUR + 40);
    });
  }

  function spawnRipple() {
    if (!bubble) return;
    const ring = document.createElement('span');
    ring.className = 'bubble-ripple';
    const br = bubble.getBoundingClientRect();
    ring.style.left = (br.left + br.width  / 2) + 'px';
    ring.style.top  = (br.top  + br.height / 2) + 'px';
    ring.style.width  = '58px';
    ring.style.height = '58px';
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 650);
  }

  /* --- Window Buttons --- */
  if (btnExpandWidth) {
    btnExpandWidth.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pState.isBubble || pState.morphing) return;
      const isWide = panel.classList.toggle('is-expanded-width');
      const targetW = isWide ? 480 : 290;
      pState.panelW = targetW;
      
      const corner = pState.corner;
      const pr = panelRect();
      if (corner === 'TR' || corner === 'BR') {
        // Expand leftwards if right anchored
        panel.style.left = (pr.right - targetW) + 'px';
        panel.style.width = targetW + 'px';
        panel.style.right = '';
      } else {
        panel.style.width = targetW + 'px';
      }
      setTimeout(() => snapToCorner(corner), 300);
    });
  }

  if (btnBubble) {
    btnBubble.addEventListener('click', (e) => {
      e.stopPropagation();
      collapsePanel();
    });
  }

  if (btnCornerCycle) {
    btnCornerCycle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pState.morphing) return;
      const idx = CORNERS.indexOf(pState.corner);
      const next = CORNERS[(idx + 1) % CORNERS.length];

      if (pState.isBubble) {
        pState.corner = next;
        panel.dataset.corner = next;
        updateCornerBadge();
        updateBubbleCorner();
      } else {
        snapToCorner(next);
      }
    });
  }

  /* --- Resize Handles --- */
  function initResize() {
    function startResize(e, mode) {
      if (e.button !== 0 || pState.isBubble || pState.morphing) return;
      e.preventDefault();
      e.stopPropagation();

      const pr = panelRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = pr.width;
      const startH = pr.height;
      const startL = pr.left;
      const startT = pr.top;
      const corner = pState.corner;

      panel.style.transition = 'none';
      panel.style.left   = startL + 'px';
      panel.style.top    = startT + 'px';
      panel.style.right  = '';
      panel.style.bottom = '';
      panel.style.width  = startW + 'px';
      panel.style.height = startH + 'px';

      const activeHandle = e.currentTarget;
      activeHandle.classList.add('resizing');
      document.body.style.cursor = window.getComputedStyle(activeHandle).cursor;

      function onResizeMove(ev) {
        const { w: vw, h: vh } = vp();
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        let newW = startW;
        let newH = startH;
        let newL = startL;
        let newT = startT;

        // Left edge resize (mode 'w' or 'sw')
        if (mode === 'w' || mode === 'sw') {
          newW = Math.max(240, startW - dx);
          newL = startL + (startW - newW);
        }
        // Right edge resize (mode 'e' or 'se')
        else if (mode === 'e' || mode === 'se') {
          newW = Math.max(240, startW + dx);
        }

        // Vertical resize (mode 's', 'sw', 'se')
        if (mode === 's' || mode === 'sw' || mode === 'se') {
          if (corner === 'BL' || corner === 'BR') {
            newH = Math.max(200, startH - dy);
            newT = startT + (startH - newH);
          } else {
            newH = Math.max(200, startH + dy);
          }
        }

        newW = Math.min(newW, vw - SNAP_GAP * 2);
        newH = Math.min(newH, vh - SNAP_GAP * 2);
        newL = Math.max(0, Math.min(newL, vw - newW));
        newT = Math.max(0, Math.min(newT, vh - newH));

        panel.style.width  = newW + 'px';
        panel.style.height = newH + 'px';
        panel.style.left   = newL + 'px';
        panel.style.top    = newT + 'px';

        pState.panelW = newW;
        pState.panelH = newH;
      }

      function onResizeEnd() {
        activeHandle.classList.remove('resizing');
        document.body.style.cursor = '';
        panel.style.transition = '';

        const newCorner = detectCornerFromCenter();
        const pr2 = panelRect();
        pState.panelW = pr2.width;
        pState.panelH = pr2.height;
        snapToCorner(newCorner);

        window.removeEventListener('mousemove', onResizeMove);
        window.removeEventListener('mouseup',   onResizeEnd);
      }

      window.addEventListener('mousemove', onResizeMove);
      window.addEventListener('mouseup',   onResizeEnd);
    }

    if (resizeW)  resizeW.addEventListener('mousedown',  (e) => startResize(e, 'w'));
    if (resizeE)  resizeE.addEventListener('mousedown',  (e) => startResize(e, 'e'));
    if (resizeS)  resizeS.addEventListener('mousedown',  (e) => startResize(e, 's'));
    if (resizeSW) resizeSW.addEventListener('mousedown', (e) => startResize(e, 'sw'));
    if (resizeSE) resizeSE.addEventListener('mousedown', (e) => startResize(e, 'se'));
  }
  initResize();

  /* --- Keyboard Shortcuts --- */
  document.addEventListener('keydown', (e) => {
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if (e.key === 'b' || e.key === 'B') {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (pState.isBubble) expandPanel();
        else collapsePanel();
      }
    }
    if (e.key === 'c' || e.key === 'C') {
      if (!e.ctrlKey && !e.metaKey && !e.altKey && btnCornerCycle) {
        btnCornerCycle.click();
      }
    }
  });

  window.addEventListener('resize', () => {
    if (!pState.isBubble && !pState.morphing) {
      snapToCorner(pState.corner);
    }
  });

  // Init panel position
  snapToCorner('TR');
})();

/* ══════════════════════════════════════════════════════════════
   EXPANDABLE & COLLAPSIBLE FOOTER (#output) CONTROLLER
   ══════════════════════════════════════════════════════════════ */
(function initExpandableFooter() {
  const output      = document.getElementById('output');
  const outHeader   = document.getElementById('out-header');
  const btnToggle   = document.getElementById('btn-toggle-out');
  const outResizeN  = document.getElementById('out-resize-n');

  if (!output) return;

  function toggleFooter() {
    output.classList.toggle('collapsed');
    const cw = document.getElementById('cw');
    if (cw && typeof resize === 'function') resize();
  }

  if (btnToggle) {
    btnToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFooter();
    });
  }

  if (outHeader) {
    outHeader.addEventListener('dblclick', (e) => {
      if (e.target.closest('button')) return;
      toggleFooter();
    });
  }

  if (outResizeN) {
    outResizeN.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const startY = e.clientY;
      const startH = output.getBoundingClientRect().height;

      output.classList.add('dragging-n');
      outResizeN.classList.add('resizing');
      document.body.style.cursor = 'ns-resize';

      function onMove(ev) {
        const dy = startY - ev.clientY;
        const maxH = window.innerHeight - 120;
        let newH = Math.max(34, Math.min(maxH, startH + dy));

        if (newH <= 45) {
          output.classList.add('collapsed');
          output.style.height = '';
        } else {
          output.classList.remove('collapsed');
          output.style.height = newH + 'px';
        }

        const cw = document.getElementById('cw');
        if (cw && typeof resize === 'function') resize();
      }

      function onUp() {
        output.classList.remove('dragging-n');
        outResizeN.classList.remove('resizing');
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup',   onUp);
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup',   onUp);
    });
  }
})();
