const $=s=>document.querySelector(s);
const E=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fmtSize=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(0)+' KB':n<1073741824?(n/1048576).toFixed(1)+' MB':(n/1073741824).toFixed(2)+' GB';
const timeF=t=>new Date(t).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
const dayF=t=>new Date(t).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(tt);tt=setTimeout(()=>t.classList.add('hidden'),2200)}

/* ---------- veritabanı ---------- */
let db;
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open('think',1);
 r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('chats',{keyPath:'id'});d.createObjectStore('items',{keyPath:'id'}).createIndex('chat','chatId')};
 r.onsuccess=()=>{db=r.result;res()};r.onerror=()=>rej(r.error)})}
function tx(store,mode,fn){return new Promise((res,rej)=>{const t=db.transaction(store,mode);const s=t.objectStore(store);let out;const q=fn(s);if(q)q.onsuccess=()=>out=q.result;t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})}
const getAll=s=>tx(s,'readonly',o=>o.getAll());
const put=(s,v)=>tx(s,'readwrite',o=>o.put(v));
const putMany=(s,a)=>tx(s,'readwrite',o=>{a.forEach(x=>o.put(x))});
const delMany=(s,a)=>tx(s,'readwrite',o=>{a.forEach(x=>o.delete(x))});
const itemsOf=c=>tx('items','readonly',o=>o.index('chat').getAll(c));

/* ---------- durum ---------- */
let chats=[],cur=null,items=[],sel=new Set(),urls=new Map(),ml=[],vi=0,vOpen=false;
const byId=id=>items.find(i=>i.id===id);
const isMedia=i=>i.type==='image'||i.type==='video';
function urlOf(it){let u=urls.get(it.id);if(!u){u=URL.createObjectURL(it.blob);urls.set(it.id,u)}return u}
function revokeAll(){urls.forEach(u=>URL.revokeObjectURL(u));urls.clear()}
function view(n){['vList','vChat','vSet'].forEach(v=>$('#'+v).classList.toggle('hidden',v!==n))}

/* ---------- tema ---------- */
const THEMES=[['visne','Vişne','#931a40'],['gece','Gece mavisi','#2a4fa6'],['zumrut','Zümrüt','#14735a'],['mor','Ametist','#7330a8'],['altin','Antik altın','#86672a']];
function setTheme(t){if(t==='visne')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem('theme',t)}catch(e){}}
setTheme((()=>{try{return localStorage.getItem('theme')||'visne'}catch(e){return 'visne'}})());

/* ---------- sohbet listesi ---------- */
async function showList(){
 view('vList');revokeAll();cur=null;clearSelQuiet();
 const [cs,its]=await Promise.all([getAll('chats'),getAll('items')]);
 const by={};its.forEach(i=>{(by[i.chatId]=by[i.chatId]||[]).push(i)});
 cs.forEach(c=>{const a=by[c.id]||[];c.n=a.length;c.last=a.sort((x,y)=>y.ts-x.ts)[0];c.t=c.last?c.last.ts:c.created});
 cs.sort((a,b)=>b.t-a.t);chats=cs;
 const L=$('#chatList');L.innerHTML='';
 if(!cs.length){L.innerHTML='<div class="empty"><b>Henüz sohbet yok</b>Sağ alttaki + ile ilk sohbetini oluştur. Örneğin “İngilizce”, “Linkler”, “Dosyalar”.</div>';return}
 cs.forEach(c=>{
  const pv=!c.last?'Boş':c.last.type==='text'?c.last.text.replace(/\n/g,' '):c.last.type==='image'?'📷 Fotoğraf':c.last.type==='video'?'🎬 Video':'📄 '+c.last.name;
  const d=E('div','ci');d.dataset.cid=c.id;
  d.innerHTML='<div class="av">'+esc(c.emoji||'📝')+'</div><div class="mid"><div class="nm">'+esc(c.name)+'</div><div class="pv">'+esc(pv)+'</div></div><div class="rt">'+(c.last?timeF(c.t):'')+'<br>'+(c.n?'<span class="bd">'+c.n+'</span>':'')+'</div>';
  let p,lf=false;
  d.addEventListener('touchstart',()=>{lf=false;p=setTimeout(()=>{lf=true;chatSheet(c)},500)},{passive:true});
  ['touchend','touchmove','touchcancel'].forEach(n=>d.addEventListener(n,()=>clearTimeout(p),{passive:true}));
  d.addEventListener('contextmenu',e=>e.preventDefault());
  d.addEventListener('click',()=>{if(lf){lf=false;return}openChat(c.id)});
  L.appendChild(d)});
}
function chatSheet(c){sheet(c.name,[{label:'✏️  Adı ve simgeyi değiştir',fn:()=>chatForm(c)},{label:'🗑  Sohbeti sil',danger:1,fn:()=>deleteChat(c)}])}
async function deleteChat(c){
 if(!confirm('“'+c.name+'” sohbeti ve içindeki her şey silinsin mi? Bu geri alınamaz.'))return;
 await tx('items','readwrite',s=>{const r=s.index('chat').openKeyCursor(IDBKeyRange.only(c.id));r.onsuccess=()=>{const k=r.result;if(k){s.delete(k.primaryKey);k.continue()}}});
 await delMany('chats',[c.id]);
 if(cur){history.back()}else showList();
}

/* ---------- yeni / düzenle sohbet ---------- */
const EMOJIS=['📝','📚','🎓','💡','🔗','🎬','📷','📁','💼','🧠','🌍','⭐','🎵','🛒','💬','🔒'];
function chatForm(c){
 let em=c?c.emoji:EMOJIS[0];
 const b=$('#mbox');b.innerHTML='<h3>'+(c?'Sohbeti düzenle':'Yeni sohbet')+'</h3><input id="mName" maxlength="40" placeholder="Sohbet adı (ör. İngilizce notları)"><div class="em"></div><div class="mb"><button id="mNo">Vazgeç</button><button class="pr" id="mOk">'+(c?'Kaydet':'Oluştur')+'</button></div>';
 $('#mName').value=c?c.name:'';
 const g=b.querySelector('.em');
 EMOJIS.forEach(x=>{const q=E('button',x===em?'on':'',x);q.onclick=()=>{em=x;g.querySelectorAll('button').forEach(z=>z.classList.toggle('on',z===q))};g.appendChild(q)});
 $('#mNo').onclick=()=>$('#modal').classList.add('hidden');
 $('#mOk').onclick=async()=>{
  const n=$('#mName').value.trim();if(!n){toast('Bir ad yaz');return}
  $('#modal').classList.add('hidden');
  if(c){c.name=n;c.emoji=em;const o={id:c.id,name:n,emoji:em,created:c.created};await put('chats',o);if(cur&&cur.id===c.id){cur=o;chatHeader()}else showList()}
  else{const o={id:uid(),name:n,emoji:em,created:Date.now()};await put('chats',o);openChat(o.id)}
 };
 $('#modal').classList.remove('hidden');setTimeout(()=>$('#mName').focus(),100);
}

/* ---------- sohbet ekranı ---------- */
function chatHeader(){$('#chatTtl').textContent=cur.name;$('#chatAv').textContent=cur.emoji||'📝'}
async function openChat(id){
 const c=(await getAll('chats')).find(x=>x.id===id);if(!c)return;
 cur=c;items=(await itemsOf(id)).sort((a,b)=>a.ts-b.ts);
 sel.clear();updSel();view('vChat');chatHeader();renderMsgs(true);
 history.pushState({v:'chat'},'');
}
function groups(){const g=[];for(const it of items){const m=isMedia(it);const l=g[g.length-1];if(m&&l&&l.media&&it.batch&&l.batch===it.batch)l.list.push(it);else g.push({media:m,batch:it.batch,list:[it]})}return g}
function tile(it){
 const t=E('div','tile');t.dataset.id=it.id;const u=urlOf(it);
 if(it.type==='image'){const im=E('img');im.src=u;im.loading='lazy';im.draggable=false;t.appendChild(im)}
 else{const v=E('video');v.src=u+'#t=0.1';v.preload='metadata';v.muted=true;v.playsInline=true;t.appendChild(v);t.appendChild(E('div','play','▶'))}
 t.appendChild(E('div','chk','✓'));
 if(sel.has(it.id))t.classList.add('sel');return t}
function linkify(s){return esc(s).replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi,m=>{const h=m.startsWith('www.')?'https://'+m:m;return '<a href="'+h+'" target="_blank" rel="noopener">'+m+'</a>'})}
function renderMsgs(scroll){
 const M=$('#msgs');const keep=M.scrollTop;M.innerHTML='';
 if(!items.length){M.innerHTML='<div class="empty"><b>Burası boş</b>Not yaz, link yapıştır ya da ＋ ile fotoğraf, video ve dosya ekle.</div>'}
 let last='';
 for(const g of groups()){
  const f=g.list[0];const d=dayF(f.ts);if(d!==last){M.appendChild(E('div','sep',d));last=d}
  const b=E('div','bub'+(g.media?' media':''));
  if(g.media){
   const gr=E('div','grid n'+(g.list.length===1?1:2));
   g.list.forEach(it=>gr.appendChild(tile(it)));
   if(g.list.length>1&&g.list.length%2===1)gr.firstChild.classList.add('wide');
   b.appendChild(gr)}
  else{b.dataset.id=f.id;if(sel.has(f.id))b.classList.add('sel');
   if(f.type==='text')b.appendChild(E('div','tx',linkify(f.text)));
   else b.appendChild(E('div','file','<div class="fi">📄</div><div><div class="fn">'+esc(f.name||'Dosya')+'</div><div class="fs">'+fmtSize(f.size||0)+'</div></div>'))}
  b.appendChild(E('div','tm',timeF(g.list[g.list.length-1].ts)));
  M.appendChild(b)}
 if(scroll)M.scrollTop=M.scrollHeight;else M.scrollTop=keep;
}
async function send(){
 const v=$('#ta').value.trim();if(!v||!cur)return;
 $('#ta').value='';grow();
 const it={id:uid(),chatId:cur.id,type:'text',text:v,ts:Date.now()};
 await put('items',it);items.push(it);renderMsgs(true)}
async function addFiles(fl){
 fl=[...fl];if(!fl.length||!cur)return;toast('Ekleniyor…');
 const batch=uid(),base=Date.now();
 const arr=fl.map((f,i)=>({id:uid(),chatId:cur.id,type:f.type.startsWith('image/')?'image':f.type.startsWith('video/')?'video':'file',blob:f,name:f.name,size:f.size,mime:f.type,ts:base+i,batch}));
 try{await putMany('items',arr);items.push(...arr);renderMsgs(true);toast(fl.length+' öğe eklendi')}
 catch(e){toast('Eklenemedi: depolama dolu olabilir')}
}
function openFile(it){
 const a=E('a');a.href=urlOf(it);a.download=it.name||'dosya';document.body.appendChild(a);a.click();a.remove();
 toast('Dosya indiriliyor…');
}
const ta=$('#ta');function grow(){ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,140)+'px'}
ta.addEventListener('input',grow);
