const $=(s,e=document)=>e.querySelector(s),view=$('#view');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fm=s=>esc(s).replace(/sqrt\(([^)]*)\)/g,'√($1)').replace(/\^(\([^)]*\)|[\w.-]+)/g,(m,a)=>'<sup>'+a.replace(/[()]/g,'')+'</sup>').replace(/_(\w+)/g,'<sub>$1</sub>');
const ytId=s=>((s||'').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/)||[])[1];
const SUPABASE_URL='https://myqfccmvcwdizacgurye.supabase.co';
const SUPABASE_KEY='sb_publishable_HwHY32W61T2AAR6X7QSDfQ_lxqrBKxx';
let idb,DB,mode='materi',quiz=null,admin={ok:false,tab:'chapters',edit:null},session=null,syncPending=false;
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('smartmath',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');r.result.createObjectStore('blobs')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const tx=(st,m,fn)=>new Promise((res,rej)=>{const t=idb.transaction(st,m),q=fn(t.objectStore(st));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)});
async function save(){
  await tx('kv','readwrite',s=>s.put(DB,'db'));
  if(!navigator.onLine){syncPending=true;toast('Tersimpan di perangkat. Akan disinkronkan saat online.');return}
  if(!session?.access_token){syncPending=true;return}
  try{
    const r=await fetch(`${SUPABASE_URL}/rest/v1/app_content?id=eq.1`,{method:'PATCH',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({data:DB,updated_at:new Date().toISOString()})});
    if(!r.ok)throw new Error(await r.text());syncPending=false;toast('Tersimpan dan dibagikan ke semua pengguna ✔');
  }catch(e){syncPending=true;toast('Tersimpan lokal. Sinkronisasi online gagal: '+(e.message||'periksa koneksi'));}
}
async function loadShared(){
  if(!navigator.onLine)return false;
  try{const r=await fetch(`${SUPABASE_URL}/rest/v1/app_content?id=eq.1&select=data`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});if(!r.ok)throw new Error(await r.text());const rows=await r.json();if(rows[0]?.data){DB=rows[0].data;await tx('kv','readwrite',s=>s.put(DB,'db'));return true}}
  catch(e){console.warn('Tidak bisa mengambil data online:',e)}return false;
}
async function loginAdmin(email,password){
 const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
 const j=await r.json();if(!r.ok)throw new Error(j.msg||j.message||j.error_description||'Login gagal');session=j;localStorage.setItem('sml_session',JSON.stringify(j));
 const check=await fetch(`${SUPABASE_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(j.user.id)}&select=user_id`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${j.access_token}`}});
 if(!check.ok)throw new Error('Tidak bisa memeriksa hak admin. Periksa policy RLS.');const rows=await check.json();if(!rows.length){session=null;localStorage.removeItem('sml_session');throw new Error('Akun berhasil login, tetapi belum terdaftar sebagai admin di tabel admin_users.')}
 admin.ok=true;adminView();
}
async function restoreSession(){try{const j=JSON.parse(localStorage.getItem('sml_session')||'null');if(!j?.access_token)return; if(j.expires_at&&j.expires_at*1000<Date.now()){if(!j.refresh_token)return;const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:j.refresh_token})});if(!r.ok)throw 0;session=await r.json();localStorage.setItem('sml_session',JSON.stringify(session))}else session=j;}catch{session=null;localStorage.removeItem('sml_session')}}
async function syncQueued(){if(!syncPending||!session?.access_token||!navigator.onLine)return;await save();}

const putBlob=(id,b)=>tx('blobs','readwrite',s=>s.put(b,id)),getBlob=id=>tx('blobs','readonly',s=>s.get(id)),delBlob=id=>tx('blobs','readwrite',s=>s.delete(id));
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)};
const chs=k=>DB.chapters.filter(c=>c.kelas==k),chName=id=>(DB.chapters.find(c=>c.id==id)||{}).judul||'-';
const seed=()=>({
chapters:[{id:'b1',kelas:7,judul:'Bilangan Bulat'},{id:'b2',kelas:8,judul:'Teorema Pythagoras'},{id:'b3',kelas:9,judul:'Bilangan Berpangkat'}],
materials:[{id:'m1',kelas:8,bab:'b2',judul:'Contoh: Teorema Pythagoras',deskripsi:'Data contoh demonstrasi. Ubah atau hapus lewat Admin.',isi:'Pada segitiga siku-siku, kuadrat sisi miring sama dengan jumlah kuadrat sisi siku-sikunya.',rumus:'c^2 = a^2 + b^2',gambar:''}],
videos:[],
questions:[{id:'q1',kelas:8,bab:'b2',soal:'Sisi siku-siku sebuah segitiga adalah 3 dan 4. Panjang sisi miringnya adalah ...',o0:'5',o1:'6',o2:'7',o3:'12',benar:0,bahas:'c = sqrt(3^2 + 4^2) = sqrt(25) = 5.'},{id:'q2',kelas:7,bab:'b1',soal:'Hasil dari -5 + 8 adalah ...',o0:'-13',o1:'-3',o2:'3',o3:'13',benar:2,bahas:'-5 + 8 = 3.'}]});

// ---------- tampilan siswa ----------
function home(){view.innerHTML=`<section class="hero"><h1>Halo, Siswa!</h1><p>Belajar matematika jadi lebih mudah dan menyenangkan.</p><div class="menu">${[['materi','📖','Materi'],['video','▶️','Video'],['kuis','📝','Kuis']].map(([k,i,l])=>`<button class="mcard ${k==mode?'on':''}" data-mode="${k}"><span>${i}</span>${l}</button>`).join('')}</div></section><h2>Pilih kelas</h2><div class="classes">${[7,8,9].map(n=>`<a class="kcard k${n}" href="#/m/${mode}/${n}"><b>${['VII','VIII','IX'][n-7]}</b><small>Kelas ${n}</small></a>`).join('')}</div><a class="adminlink" href="#/admin">⚙️ Admin</a>`}
function list(md,k){const T={materi:'Materi',video:'Video',kuis:'Kuis'};if(!T[md]||![7,8,9].includes(+k))return home();mode=md;const cs=chs(k);
view.innerHTML=`<a class="back" href="#/">← Beranda</a><h2>${T[md]} Kelas ${k}</h2><div class="tabs">${Object.keys(T).map(x=>`<a class="${x==md?'on':''}" href="#/m/${x}/${k}">${T[x]}</a>`).join('')}</div>`
+(md=='kuis'&&cs.length?`<a class="btn" href="#/kuis/${k}/all">Kuis campuran semua bab (${DB.questions.filter(q=>q.kelas==k).length} soal)</a>`:'')
+(cs.length?cs.map(c=>{let b='';
if(md=='materi')b=DB.materials.filter(m=>m.bab==c.id).map(m=>`<a class="item" href="#/materi/${m.id}">${esc(m.judul)}<small>${esc(m.deskripsi)}</small></a>`).join('');
if(md=='video')b=DB.videos.filter(v=>v.bab==c.id).map(v=>`<div class="item"><b>${esc(v.judul)}</b><small>${esc(v.deskripsi)} ${v.tipe=='lokal'?'· offline':'· butuh internet'}</small><div class="player" id="p-${v.id}"><button class="btn" data-play="${v.id}">▶ Putar</button></div></div>`).join('');
if(md=='kuis'){const n=DB.questions.filter(q=>q.bab==c.id).length;b=n?`<a class="btn" href="#/kuis/${k}/${c.id}">Mulai kuis (${n} soal)</a>`:''}
return `<div class="card"><h3>${esc(c.judul)}</h3>${b||'<small class="muted">Belum ada isi.</small>'}</div>`}).join(''):'<p class="empty">Belum ada bab. Tambahkan lewat halaman Admin.</p>')}
function detail(id){const m=DB.materials.find(x=>x.id==id);if(!m)return home();
view.innerHTML=`<a class="back" href="#/m/materi/${m.kelas}">← Kelas ${m.kelas}</a><article class="card"><small>Kelas ${m.kelas} · ${esc(chName(m.bab))}</small><h1>${esc(m.judul)}</h1><p>${esc(m.deskripsi)}</p>${m.gambar?`<img class="pic" src="${m.gambar}" alt="">`:''}<div class="txt">${esc(m.isi)}</div>${m.rumus?`<div class="formula">${fm(m.rumus).replace(/\n/g,'<br>')}</div>`:''}</article>`}
async function play(id){const v=DB.videos.find(x=>x.id==id),box=$('#p-'+id);if(!v||!box)return;
if(v.tipe=='lokal'){const b=await getBlob(id);if(!b)return toast('File video tidak ditemukan di perangkat ini. Unggah ulang lewat Admin.');box.innerHTML=`<video controls autoplay src="${URL.createObjectURL(b)}"></video>`}
else{const y=ytId(v.link);if(!y)return toast('Link YouTube tidak valid');if(!navigator.onLine)return toast('Sedang offline. Video YouTube butuh internet.');box.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${y}" allowfullscreen allow="autoplay;encrypted-media;picture-in-picture"></iframe>`}}
function startQuiz(k,b){const qs=DB.questions.filter(q=>q.kelas==k&&(b=='all'||q.bab==b)).sort(()=>Math.random()-.5);quiz={k,b,qs,i:0,a:[],sel:null};renderQuiz()}
function renderQuiz(){const z=quiz;if(!z)return home();
if(!z.qs.length){view.innerHTML=`<a class="back" href="#/m/kuis/${z.k}">← Kembali</a><p class="empty">Belum ada soal untuk bab ini.</p>`;return}
if(z.i>=z.qs.length){const ok=z.qs.filter((q,i)=>z.a[i]==q.benar).length,sc=Math.round(ok/z.qs.length*100);
view.innerHTML=`<section class="card center"><h2>Hasil Kuis</h2><div class="score">${sc}</div><p>Benar ${ok} dari ${z.qs.length} soal</p></section>`+z.qs.map((q,i)=>`<div class="card"><b>${i+1}. ${esc(q.soal)}</b><p class="${z.a[i]==q.benar?'ok':'bad'}">Jawabanmu: ${'ABCD'[z.a[i]]}. ${esc(q['o'+z.a[i]])}</p><small>Jawaban benar: ${'ABCD'[q.benar]}. ${esc(q['o'+q.benar])}</small><p>${fm(q.bahas||'')}</p></div>`).join('')+`<a class="btn ghost" href="#/m/kuis/${z.k}">Selesai</a> <button class="btn" data-act="retry">Ulangi</button>`;return}
const q=z.qs[z.i];
view.innerHTML=`<a class="back" href="#/m/kuis/${z.k}">← Keluar</a><div class="card"><small>Soal ${z.i+1} dari ${z.qs.length}</small><div class="bar"><i style="width:${z.i/z.qs.length*100}%"></i></div><h3>${fm(q.soal)}</h3>${[0,1,2,3].map(n=>{let c='';if(z.sel!=null){if(n==q.benar)c='right';else if(n==z.sel)c='wrong'}return `<button class="opt ${c}" data-opt="${n}" ${z.sel!=null?'disabled':''}><b>${'ABCD'[n]}.</b> ${fm(q['o'+n])}</button>`}).join('')}${z.sel!=null?`<div class="bahas"><b>${z.sel==q.benar?'✅ Benar!':'❌ Kurang tepat.'}</b><p>${fm(q.bahas||'')}</p><button class="btn" data-act="next">${z.i+1<z.qs.length?'Lanjut':'Lihat hasil'}</button></div>`:''}</div>`}

// ---------- admin ----------
const K=['kelas','Kelas','kelas'],B=['bab','Bab','bab'];
const COL={
chapters:{f:[K,['judul','Judul bab','text']],label:o=>`Kelas ${o.kelas} · ${o.judul}`},
materials:{f:[K,B,['judul','Judul materi','text'],['deskripsi','Deskripsi','area'],['isi','Isi materi','area'],['rumus','Rumus (contoh: a^2 + b^2 = c^2, sqrt(x), x_1)','area'],['gambar','Gambar pendukung','img']],label:o=>`K${o.kelas} · ${chName(o.bab)} · ${o.judul}`},
videos:{f:[K,B,['judul','Judul video','text'],['deskripsi','Deskripsi video','area'],['tipe','Jenis video','tipe'],['link','Link YouTube (jika jenis YouTube)','text'],['file','File video lokal (jika jenis lokal)','file']],label:o=>`K${o.kelas} · ${chName(o.bab)} · ${o.judul} (${o.tipe})`},
questions:{f:[K,B,['soal','Soal','area'],['o0','Pilihan A','text'],['o1','Pilihan B','text'],['o2','Pilihan C','text'],['o3','Pilihan D','text'],['benar','Jawaban benar','benar'],['bahas','Pembahasan','area']],label:o=>`K${o.kelas} · ${chName(o.bab)} · ${(o.soal||'').slice(0,50)}`}};
const NAMES={chapters:'Bab',materials:'Materi',videos:'Video',questions:'Soal',data:'Data'};
function formHTML(c,v){return c.f.map(([k,l,t])=>{const val=v[k]??'';let i;
if(t=='text')i=`<input name="${k}" value="${esc(val)}">`;
else if(t=='area')i=`<textarea name="${k}" rows="3">${esc(val)}</textarea>`;
else if(t=='kelas')i=`<select name="kelas">${[7,8,9].map(n=>`<option ${n==(val||7)?'selected':''}>${n}</option>`).join('')}</select>`;
else if(t=='bab')i=`<select name="bab"></select>`;
else if(t=='tipe')i=`<select name="tipe">${[['youtube','YouTube (online)'],['lokal','File lokal (offline)']].map(([x,y])=>`<option value="${x}" ${x==val?'selected':''}>${y}</option>`).join('')}</select>`;
else if(t=='benar')i=`<select name="benar">${[...'ABCD'].map((x,n)=>`<option value="${n}" ${n==val?'selected':''}>${x}</option>`).join('')}</select>`;
else if(t=='img')i=`<input type="file" name="${k}" accept="image/*">${val?`<img class="thumb" src="${val}" alt="">`:''}`;
else i=`<input type="file" name="${k}" accept="video/*">${v.fileName?`<small>Tersimpan: ${esc(v.fileName)}</small>`:''}`;
return `<label>${l}${i}</label>`}).join('')}
const shrink=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,900/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.82))};im.onerror=rej;im.src=r.result};r.onerror=rej;r.readAsDataURL(f)});
async function saveForm(key,form){const c=COL[key],old=DB[key].find(x=>x.id==admin.edit),o={...(old||{id:uid()})};
for(const [k,,t] of c.f){const el=form.elements[k];
if(t=='img'){const f=el.files[0];if(f)o[k]=await shrink(f)}
else if(t=='file'){const f=el.files[0];if(f){await putBlob(o.id,f);o.fileName=f.name}}
else o[k]=['kelas','benar'].includes(t)?+el.value:el.value.trim()}
if(!(o.judul||o.soal))return toast('Judul/soal wajib diisi');
if(key!='chapters'&&!o.bab)return toast('Pilih bab (buat bab dulu di tab Bab)');
if(key=='videos'){if(o.tipe=='youtube'&&!ytId(o.link))return toast('Link YouTube tidak valid');if(o.tipe=='lokal'&&!o.fileName)return toast('Pilih file video lokal')}
if(key=='questions'&&![0,1,2,3].every(n=>o['o'+n]))return toast('Isi keempat pilihan jawaban');
if(old)Object.assign(old,o);else DB[key].push(o);
await save();admin.edit=null;toast('Tersimpan ✔');adminView()}
async function delItem(key,id){if(!confirm(key=='chapters'?'Hapus bab ini beserta semua materi, video, dan soal di dalamnya?':'Hapus item ini?'))return;
if(key=='chapters')['materials','videos','questions'].forEach(k=>DB[k]=DB[k].filter(x=>x.bab!=id));
DB[key]=DB[key].filter(x=>x.id!=id);await delBlob(id).catch(()=>0);await save();toast('Dihapus');adminView()}
const dataPanel=()=>`<div class="card"><h3>Akun Admin</h3><p>Login menggunakan Supabase. Perubahan konten akan tersimpan online untuk semua pengguna saat terhubung internet.</p><button class="btn ghost" data-act="logout">Keluar dari akun admin</button></div><div class="card"><h3>Ekspor / Impor</h3><p>Cadangkan bab, materi (termasuk gambar), link video, dan soal. File video lokal <b>tidak</b> ikut diekspor.</p><button class="btn" data-act="export">⬇ Ekspor data</button> <label class="btn ghost">⬆ Impor data<input type="file" id="imp" accept=".json" hidden></label></div><div class="card"><h3>Reset</h3><button class="btn ghost" data-act="reset">Kembalikan ke data contoh</button></div>`;
function adminView(){
if(!admin.ok){view.innerHTML=`<a class="back" href="#/">← Beranda</a><form class="card" id="adminLogin"><h2>Login Admin</h2><p>Masuk menggunakan email dan password akun Supabase admin.</p><label>Email<input name="email" type="email" required autocomplete="username"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label><button class="btn">Masuk</button></form>`;$('#adminLogin').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;b.textContent='Memeriksa...';try{await loginAdmin(e.target.email.value.trim(),e.target.password.value)}catch(err){toast(err.message||'Login gagal')}finally{b.disabled=false;b.textContent='Masuk'}};return}

const t=admin.tab;let body;
if(t=='data')body=dataPanel();else{const c=COL[t];body=`<form class="card" id="f"><h3>${admin.edit?'Edit':'Tambah'} ${NAMES[t]}</h3>${formHTML(c,DB[t].find(x=>x.id==admin.edit)||{})}<button class="btn">Simpan</button> ${admin.edit?'<button type="button" class="btn ghost" data-act="cancel">Batal</button>':''}</form><h3>Daftar (${DB[t].length})</h3>`+(DB[t].map(x=>`<div class="row"><span>${esc(c.label(x))}</span><button data-edit="${x.id}">Edit</button><button class="del" data-del="${x.id}">Hapus</button></div>`).join('')||'<p class="empty">Belum ada data.</p>')}
view.innerHTML=`<a class="back" href="#/">← Beranda</a><div class="tabs">${Object.keys(NAMES).map(k=>`<button data-tab="${k}" class="${k==t?'on':''}">${NAMES[k]}</button>`).join('')}<button data-act="lock">🔒 Kunci</button></div>`+body;
if(t=='data'){$('#imp').onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text()),d=j.data||j;if(!KEY.every(k=>Array.isArray(d[k])))throw 0;if(!confirm('Data saat ini akan diganti dengan isi file. Lanjutkan?'))return;KEY.forEach(k=>DB[k]=d[k]);await save();toast('Impor berhasil');adminView()}catch{toast('File tidak valid')}};return}
const f=$('#f'),b=f.elements.bab;f.onsubmit=e=>{e.preventDefault();saveForm(t,f)};
if(b){const fill=s=>{b.innerHTML=chs(f.elements.kelas.value).map(c=>`<option value="${c.id}">${esc(c.judul)}</option>`).join('')||'<option value="">(buat bab dulu)</option>';b.value=s;if(!b.value)b.selectedIndex=0};fill((DB[t].find(x=>x.id==admin.edit)||{}).bab);f.elements.kelas.onchange=()=>fill()}}
const KEY=['chapters','materials','videos','questions'];

// ---------- aksi global ----------
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
if(d.mode){mode=d.mode;home()}
else if(d.play)play(d.play);
else if(d.opt!=null){quiz.sel=+d.opt;quiz.a[quiz.i]=quiz.sel;renderQuiz()}
else if(d.tab){admin.tab=d.tab;admin.edit=null;adminView()}
else if(d.edit){admin.edit=d.edit;adminView();scrollTo(0,0)}
else if(d.del)delItem(admin.tab,d.del);
else if(d.act=='next'){quiz.i++;quiz.sel=null;renderQuiz()}
else if(d.act=='retry')startQuiz(quiz.k,quiz.b);
else if(d.act=='cancel'){admin.edit=null;adminView()}
else if(d.act=='lock'){admin.ok=false;adminView()}
else if(d.act=='logout'){session=null;localStorage.removeItem('sml_session');admin.ok=false;adminView();toast('Berhasil keluar')}
else if(d.act=='export'){const a=document.createElement('a'),data=DB;a.href=URL.createObjectURL(new Blob([JSON.stringify({app:'smart-math-learning',data},null,1)],{type:'application/json'}));a.download='smart-math-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click()}
else if(d.act=='reset'){if(confirm('Semua data akan diganti data contoh. Lanjutkan?')){DB=seed();await save();toast('Direset');adminView()}}});

function route(){const h=location.hash.slice(2).split('/');
if(h[0]=='m')list(h[1],h[2]);else if(h[0]=='materi')detail(h[1]);else if(h[0]=='kuis')startQuiz(h[1],h[2]);else if(h[0]=='admin')adminView();else home();scrollTo(0,0)}
const net=()=>{const n=$('#net');n.textContent=navigator.onLine?'Online':'Offline';n.classList.toggle('off',!navigator.onLine)};
addEventListener('online',net);addEventListener('offline',net);addEventListener('hashchange',route);
addEventListener('online',async()=>{net();if(syncPending&&session){await syncQueued();if(syncPending)return}await loadShared().then(()=>route())});
(async()=>{net();try{idb=await open();DB=await tx('kv','readonly',s=>s.get('db'));if(!DB)DB=seed();await restoreSession();const got=await loadShared();if(!got)await tx('kv','readwrite',s=>s.put(DB,'db'));route();if('serviceWorker'in navigator&&location.protocol!='file:')navigator.serviceWorker.register('service-worker.js').catch(()=>0)}catch{DB=seed();view.innerHTML='<p class="empty">Penyimpanan lokal tidak tersedia di browser ini.</p>';return}})();
