/* ---------- seçim modu ---------- */
function updSel(){
 const on=sel.size>0;
 $('#chatTop').classList.toggle('hidden',on);$('#selTop').classList.toggle('hidden',!on);$('#comp').classList.toggle('hidden',on);
 $('#msgs').classList.toggle('selmode',on);$('#sCnt').textContent=sel.size+' seçildi';
 document.querySelectorAll('#msgs [data-id]').forEach(e=>e.classList.toggle('sel',sel.has(e.dataset.id)));
}
function toggleSel(id){sel.has(id)?sel.delete(id):sel.add(id);updSel()}
function clearSelQuiet(){sel.clear();$('#selTop').classList.add('hidden');$('#chatTop').classList.remove('hidden');$('#comp').classList.remove('hidden');$('#msgs').classList.remove('selmode')}
async function delSel(){
 if(!sel.size||!confirm(sel.size+' öğe silinsin mi?'))return;
 const ids=[...sel];await delMany('items',ids);
 ids.forEach(id=>{const u=urls.get(id);if(u){URL.revokeObjectURL(u);urls.delete(id)}});
 items=items.filter(i=>!ids.includes(i.id));sel.clear();updSel();renderMsgs();toast('Silindi')}
$('#sCancel').onclick=()=>{sel.clear();updSel()};
$('#sDel').onclick=delSel;
$('#sCopy').onclick=async()=>{
 const t=items.filter(i=>sel.has(i.id)&&i.type==='text').map(i=>i.text).join('\n\n');
 if(!t){toast('Seçilenlerde yazı yok');return}
 try{await navigator.clipboard.writeText(t);toast('Kopyalandı')}catch(e){toast('Kopyalanamadı')}};

const M=$('#msgs');let pt,lf=false;
M.addEventListener('touchstart',e=>{lf=false;const el=e.target.closest('[data-id]');if(!el)return;pt=setTimeout(()=>{lf=true;if(navigator.vibrate)navigator.vibrate(15);toggleSel(el.dataset.id)},420)},{passive:true});
['touchend','touchmove','touchcancel'].forEach(n=>M.addEventListener(n,()=>clearTimeout(pt),{passive:true}));
M.addEventListener('contextmenu',e=>e.preventDefault());
M.addEventListener('click',e=>{
 if(lf){lf=false;e.preventDefault();return}
 const a=e.target.closest('a');
 if(a&&!sel.size)return;
 if(a)e.preventDefault();
 const el=e.target.closest('[data-id]');if(!el)return;
 const id=el.dataset.id;
 if(sel.size){toggleSel(id);return}
 const it=byId(id);if(!it)return;
 if(isMedia(it))openViewer(id);else if(it.type==='file')openFile(it);
});

/* ---------- tam ekran görüntüleyici ---------- */
let sc=1,tx0=0,ty0=0,mode=null,sx=0,sy=0,lx=0,ly=0,stx=0,sty=0,d0=0,sc0=1,lastTap=0;
const stage=$('#stage');
function applyT(extraX,extraY){const im=stage.querySelector('img');if(im)im.style.transform='translate('+(tx0+(extraX||0))+'px,'+(ty0+(extraY||0))+'px) scale('+sc+')'}
function resetT(){sc=1;tx0=0;ty0=0;applyT()}
function showMedia(){
 stage.innerHTML='';sc=1;tx0=0;ty0=0;
 const it=ml[vi];const u=urlOf(it);
 if(it.type==='image'){const im=E('img');im.src=u;im.draggable=false;stage.appendChild(im)}
 else{const v=E('video');v.src=u;v.controls=true;v.autoplay=true;v.playsInline=true;stage.appendChild(v)}
 $('#vCt').textContent=(vi+1)+' / '+ml.length;
 $('#vPrev').classList.toggle('hidden',vi===0);$('#vNext').classList.toggle('hidden',vi===ml.length-1);
}
function openViewer(id){
 ml=items.filter(isMedia);vi=Math.max(0,ml.findIndex(i=>i.id===id));
 $('#viewer').classList.remove('hidden');vOpen=true;showMedia();history.pushState({v:'viewer'},'');
}
function hideViewer(){stage.innerHTML='';$('#viewer').classList.add('hidden');vOpen=false}
$('#vClose').onclick=()=>history.back();
$('#vPrev').onclick=()=>{if(vi>0){vi--;showMedia()}};
$('#vNext').onclick=()=>{if(vi<ml.length-1){vi++;showMedia()}};
$('#vDel').onclick=async()=>{
 if(!confirm('Bu öğe silinsin mi?'))return;
 const it=ml[vi];await delMany('items',[it.id]);
 const u=urls.get(it.id);
 items=items.filter(x=>x.id!==it.id);ml.splice(vi,1);renderMsgs();
 if(u){URL.revokeObjectURL(u);urls.delete(it.id)}
 if(!ml.length){history.back();return}
 if(vi>=ml.length)vi=ml.length-1;showMedia();toast('Silindi')};
const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
stage.addEventListener('touchstart',e=>{
 if(e.target.tagName==='VIDEO'){mode='video';return}
 const t=e.touches;
 if(t.length===2){mode='pinch';d0=dist(t);sc0=sc;return}
 const now=Date.now();
 if(now-lastTap<300){sc=sc>1?1:2.6;tx0=0;ty0=0;applyT();lastTap=0;mode=null;return}
 lastTap=now;mode=sc>1?'pan':'swipe';sx=lx=t[0].clientX;sy=ly=t[0].clientY;stx=tx0;sty=ty0;
},{passive:true});
stage.addEventListener('touchmove',e=>{
 if(mode==='video')return;e.preventDefault();const t=e.touches;
 if(mode==='pinch'&&t.length===2){sc=Math.min(6,Math.max(1,sc0*dist(t)/d0));if(sc===1){tx0=0;ty0=0}applyT()}
 else if(mode==='pan'){lx=t[0].clientX;ly=t[0].clientY;const mx=(sc-1)*stage.clientWidth/2,my=(sc-1)*stage.clientHeight/2;tx0=Math.max(-mx,Math.min(mx,stx+lx-sx));ty0=Math.max(-my,Math.min(my,sty+ly-sy));applyT()}
 else if(mode==='swipe'){lx=t[0].clientX;ly=t[0].clientY;const dx=lx-sx,dy=ly-sy;
  if(Math.abs(dy)>Math.abs(dx)&&dy>0){applyT(0,dy);stage.style.opacity=Math.max(.3,1-dy/500)}else applyT(dx,0)}
},{passive:false});
stage.addEventListener('touchend',e=>{
 if(mode==='video'){mode=null;return}
 stage.style.opacity=1;
 if(mode==='pinch'){if(sc<1.05)resetT();mode=e.touches.length===1?'none':null;return}
 if(mode==='swipe'){const dx=lx-sx,dy=ly-sy;
  if(dy>110&&Math.abs(dy)>Math.abs(dx)){history.back()}
  else if(dx<-70&&vi<ml.length-1){vi++;showMedia()}
  else if(dx>70&&vi>0){vi--;showMedia()}
  else applyT()}
 mode=null;
},{passive:true});

/* ---------- menüler ---------- */
function sheet(title,opts){
 const s=$('#sheet');s.innerHTML='';if(title)s.appendChild(E('div','sh',esc(title)));
 opts.forEach(o=>{const b=E('button','so'+(o.danger?' dg':''),o.label);b.onclick=()=>{closeSheet();o.fn()};s.appendChild(b)});
 $('#sheetWrap').classList.remove('hidden')}
function closeSheet(){$('#sheetWrap').classList.add('hidden')}
$('#sheetWrap').addEventListener('click',e=>{if(e.target.id==='sheetWrap')closeSheet()});
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')$('#modal').classList.add('hidden')});

$('#fab').onclick=()=>chatForm();
$('#bBack').onclick=()=>history.back();
$('#bMore').onclick=()=>chatSheet(cur);
$('#bSend').onclick=send;
$('#bAtt').onclick=()=>sheet('Ekle',[{label:'🖼  Fotoğraf ve video',fn:()=>$('#fMedia').click()},{label:'📄  Dosya',fn:()=>$('#fAny').click()}]);
['fMedia','fAny'].forEach(id=>$('#'+id).addEventListener('change',e=>{addFiles(e.target.files);e.target.value=''}));

/* ---------- ayarlar ---------- */
function showSettings(push){
 view('vSet');const box=$('#themes');box.innerHTML='';
 let curT='visne';try{curT=localStorage.getItem('theme')||'visne'}catch(e){}
 THEMES.forEach(([k,n,c])=>{const b=E('button','th'+(k===curT?' on':''),'<div class="sw" style="background:'+c+'"></div><span class="n">'+n+'</span>'+(k===curT?'<span>✓</span>':''));
  b.onclick=()=>{setTheme(k);showSettings(false)};box.appendChild(b)});
 if(navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(r=>{$('#stor').textContent='Kullanılan alan: '+fmtSize(r.usage||0)+'. Her şey sadece bu telefonda saklanır, hiçbir şey otomatik silinmez.'});
 if(push)history.pushState({v:'set'},'');
}
$('#bSet').onclick=()=>showSettings(true);
$('#setBack').onclick=()=>history.back();

/* ---------- geri tuşu ---------- */
window.addEventListener('popstate',()=>{
 if(!$('#modal').classList.contains('hidden')){$('#modal').classList.add('hidden')}
 if(vOpen){hideViewer();return}
 if(sel.size&&cur){sel.clear();updSel();history.pushState({v:'chat'},'');return}
 showList();
});

(async()=>{
 await openDB();
 if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
 history.replaceState({v:'list'},'');
 showList();
})();
