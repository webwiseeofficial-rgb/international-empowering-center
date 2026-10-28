(function(){
const {esc,LV,IC}=window.IEC_UTIL,$=s=>document.querySelector(s);
const cfg=window.IEC||{};
if(!window.supabase||!cfg.url||/VOTRE/.test(cfg.url+cfg.key)){$("#cfgmsg").hidden=false;return}
const db=window.supabase.createClient(cfg.url,cfg.key);
const S={ins:[],chap:[],fm:[]};
const toast=(m,bad)=>{const t=$("#toast");t.textContent=m;t.className="on"+(bad?" bad":"");clearTimeout(t._t);t._t=setTimeout(()=>t.className="",2800)};
const fail=e=>{console.error(e);toast("Erreur : "+(e.message||e),true)};
const dstr=d=>new Date(d).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
// ---- Auth
async function show(session){
  $("#login").hidden=!!session;$("#app").hidden=!session;
  if(session){$("#me").textContent=session.user.email;await loadAll()}
}
db.auth.getSession().then(({data})=>show(data.session));
db.auth.onAuthStateChange((ev,s)=>{if(ev==="SIGNED_OUT")show(null)});
$("#lf").addEventListener("submit",async e=>{e.preventDefault();$("#lerr").textContent="";
  const {data,error}=await db.auth.signInWithPassword({email:$("#em").value.trim(),password:$("#pw").value});
  if(error)$("#lerr").textContent="E-mail ou mot de passe incorrect.";else show(data.session)});
$("#out").addEventListener("click",()=>db.auth.signOut());
// ---- Tabs
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tabs button").forEach(x=>x.classList.toggle("on",x===b));
  ["stats","insc","chap","form"].forEach(t=>$("#v-"+t).hidden=t!==b.dataset.t)}));
// ---- Chargement
async function loadAll(){
  const [i,c,f]=await Promise.all([db.from("inscriptions").select("*").order("created_at",{ascending:false}).limit(5000),db.from("chapitres").select("*").order("ordre"),db.from("formateurs").select("*").order("ordre")]);
  if(i.error)return fail(i.error);if(c.error)return fail(c.error);if(f.error)return fail(f.error);
  S.ins=i.data;S.chap=c.data;S.fm=f.data;stats();table();chapList();fmList();
}
// ---- Statistiques
function bars(rows,max){return rows.length?rows.map(([l,n])=>`<div class="br"><span title="${esc(l)}">${esc(l)}</span><i><b style="width:${max?n/max*100:0}%"></b></i><span>${n}</span></div>`).join(""):'<p class="muted">Aucune donnée pour le moment.</p>'}
function count(arr,fn){const m={};arr.forEach(x=>{const k=fn(x)||"Non précisé";m[k]=(m[k]||0)+1});return m}
function stats(){
  const I=S.ins,now=Date.now(),D=864e5,n7=I.filter(x=>now-new Date(x.created_at)<7*D).length,n30=I.filter(x=>now-new Date(x.created_at)<30*D).length;
  const nv=I.filter(x=>x.statut==="nouveau").length,ok=I.filter(x=>x.statut==="inscrit").length,conv=I.length?Math.round(ok/I.length*100):0;
  const days=[];for(let k=29;k>=0;k--)days.push(new Date(now-k*D).toISOString().slice(0,10));
  const per=count(I,x=>new Date(x.created_at).toISOString().slice(0,10)),mx=Math.max(1,...days.map(d=>per[d]||0));
  const lvl=count(I,x=>{const n=LV.find(l=>(x.niveau||"").startsWith(l));return n||(x.niveau?"Niveau inconnu":"")});
  const lr=[...LV,"Niveau inconnu","Non précisé"].filter(l=>lvl[l]).map(l=>[l,lvl[l]]),lm=Math.max(0,...lr.map(r=>r[1]));
  const pc=Object.entries(count(I,x=>x.parcours)).sort((a,b)=>b[1]-a[1]).slice(0,8),pm=pc.length?pc[0][1]:0;
  const st=count(I,x=>x.statut),sr=["nouveau","contacté","inscrit","annulé"].map(s=>[s,st[s]||0]);
  $("#v-stats").innerHTML=`<div class="kpis"><div class="kpi"><small>Inscriptions (total)</small><b>${I.length}</b><span>depuis le début</span></div><div class="kpi"><small>30 derniers jours</small><b>${n30}</b><span>${n7} sur les 7 derniers jours</span></div><div class="kpi"><small>À traiter</small><b>${nv}</b><span>statut « nouveau »</span></div><div class="kpi"><small>Taux de conversion</small><b>${conv} %</b><span>${ok} inscrit(s) confirmé(s)</span></div></div>
<div class="cards2"><div class="card2 w"><h3>Inscriptions par jour (30 derniers jours)</h3><div class="chart">${days.map(d=>{const n=per[d]||0;return `<i class="${n?"":"z"}" style="height:${n?Math.max(8,n/mx*100):2}%" title="${d} : ${n}"></i>`}).join("")}</div><div class="axis"><span>${days[0]}</span><span>${days[29]}</span></div></div>
<div class="card2"><h3>Par niveau</h3>${bars(lr,lm)}</div><div class="card2"><h3>Par chapitre demandé</h3>${bars(pc,pm)}</div><div class="card2"><h3>Par statut</h3>${bars(sr,Math.max(1,...sr.map(r=>r[1])))}</div><div class="card2"><h3>Par formateur</h3>${bars(Object.entries(count(I,x=>x.formateur)),Math.max(1,...Object.values(count(I,x=>x.formateur))))}</div></div>`;
}
// ---- Inscriptions
function table(){
  const q=$("#q").value.toLowerCase(),fs=$("#fs").value;
  const rows=S.ins.filter(x=>(!fs||x.statut===fs)&&(!q||[x.prenom,x.nom,x.email,x.telephone].join(" ").toLowerCase().includes(q)));
  $("#tbl").innerHTML=`<thead><tr><th>Date</th><th>Nom</th><th>Contact</th><th>Niveau / chapitre</th><th>Formateur</th><th>Statut</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr data-id="${x.id}"><td>${dstr(x.created_at)}</td><td><b>${esc(x.prenom)} ${esc(x.nom)}</b>${x.objectif?`<small>${esc(x.objectif)}</small>`:""}</td><td><a href="mailto:${esc(x.email)}">${esc(x.email)}</a><small><a href="tel:${esc(x.telephone)}">${esc(x.telephone)}</a></small></td><td>${esc(x.niveau)}<small>${esc(x.parcours)}</small></td><td>${esc(x.formateur)}</td><td><select class="st">${["nouveau","contacté","inscrit","annulé"].map(s=>`<option${s===x.statut?" selected":""}>${s}</option>`).join("")}</select></td><td><button class="del">Supprimer</button></td></tr>`).join("")||'<tr><td colspan="7" class="muted">Aucune inscription.</td></tr>'}</tbody>`;
}
$("#q").addEventListener("input",table);$("#fs").addEventListener("change",table);
$("#tbl").addEventListener("change",async e=>{if(!e.target.classList.contains("st"))return;const id=e.target.closest("tr").dataset.id;
  const {error}=await db.from("inscriptions").update({statut:e.target.value}).eq("id",id);if(error)return fail(error);S.ins.find(x=>x.id===id).statut=e.target.value;stats();toast("Statut mis à jour")});
$("#tbl").addEventListener("click",async e=>{if(!e.target.classList.contains("del"))return;const id=e.target.closest("tr").dataset.id;if(!confirm("Supprimer cette inscription ?"))return;
  const {error}=await db.from("inscriptions").delete().eq("id",id);if(error)return fail(error);S.ins=S.ins.filter(x=>x.id!==id);stats();table();toast("Inscription supprimée")});
$("#csv").addEventListener("click",()=>{const c=["created_at","prenom","nom","email","telephone","niveau","parcours","formateur","statut","objectif"];
  const l=[c.join(",")].concat(S.ins.map(x=>c.map(k=>'"'+String(x[k]==null?"":x[k]).replace(/"/g,'""')+'"').join(",")));
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+l.join("\n")],{type:"text/csv"}));a.download="inscriptions.csv";a.click()});
// ---- Chapitres
$("#c-icone").innerHTML=Object.keys(IC).map(k=>`<option>${k}</option>`).join("");
$("#c-min").innerHTML=$("#c-max").innerHTML=LV.map((l,i)=>`<option value="${i}">${l}</option>`).join("");$("#c-max").value=5;
function chapList(){$("#chapList").innerHTML=S.chap.map(c=>`<div class="item" data-id="${c.id}"><div class="tx"><b>${esc(c.titre)}</b><small>${LV[c.niveau_min]} → ${LV[c.niveau_max]} · ordre ${c.ordre}</small></div><span class="badge${c.actif?"":" off"}">${c.actif?"Visible":"Masqué"}</span><div class="ac"><button class="edit">Modifier</button><button class="del">Supprimer</button></div></div>`).join("")||'<p class="muted">Aucun chapitre.</p>'}
function cReset(){$("#cf").reset();$("#c-id").value="";$("#c-max").value=5;$("#c-cancel").hidden=true}
$("#c-cancel").addEventListener("click",cReset);
$("#cf").addEventListener("submit",async e=>{e.preventDefault();
  const p={titre:$("#c-titre").value.trim(),description:$("#c-desc").value.trim(),icone:$("#c-icone").value,niveau_min:+$("#c-min").value,niveau_max:+$("#c-max").value,ordre:+$("#c-ordre").value||0,actif:$("#c-actif").checked},id=$("#c-id").value;
  if(p.niveau_min>p.niveau_max)return toast("Le niveau minimum doit être inférieur au maximum",true);
  const {error}=id?await db.from("chapitres").update(p).eq("id",id):await db.from("chapitres").insert(p);if(error)return fail(error);
  cReset();toast("Chapitre enregistré");loadAll()});
$("#chapList").addEventListener("click",async e=>{const it=e.target.closest(".item");if(!it)return;const c=S.chap.find(x=>x.id===it.dataset.id);
  if(e.target.classList.contains("edit")){$("#c-id").value=c.id;$("#c-titre").value=c.titre;$("#c-desc").value=c.description||"";$("#c-icone").value=c.icone;$("#c-min").value=c.niveau_min;$("#c-max").value=c.niveau_max;$("#c-ordre").value=c.ordre;$("#c-actif").checked=c.actif;$("#c-cancel").hidden=false;scrollTo({top:0,behavior:"smooth"})}
  if(e.target.classList.contains("del")){if(!confirm("Supprimer ce chapitre ?"))return;const {error}=await db.from("chapitres").delete().eq("id",c.id);if(error)return fail(error);toast("Chapitre supprimé");loadAll()}});
// ---- Formateurs
function fmList(){$("#fmList2").innerHTML=S.fm.map(f=>`<div class="item" data-id="${f.id}">${f.photo_url?`<img src="${esc(f.photo_url)}" alt="">`:`<div class="ph2">${esc(f.nom.slice(0,1))}</div>`}<div class="tx"><b>${esc(f.nom)}</b><small>${esc(f.titre)}</small></div><span class="badge${f.actif?"":" off"}">${f.actif?"Visible":"Masqué"}</span><div class="ac"><button class="edit">Modifier</button><button class="del">Supprimer</button></div></div>`).join("")||'<p class="muted">Aucun formateur.</p>'}
function fReset(){$("#ff").reset();$("#f-id").value="";$("#f-cancel").hidden=true;$("#ff").dataset.photo=""}
$("#f-cancel").addEventListener("click",fReset);
$("#ff").addEventListener("submit",async e=>{e.preventDefault();const btn=e.target.querySelector("button[type=submit]");btn.disabled=true;
  try{
    let photo=$("#ff").dataset.photo||null;const file=$("#f-file").files[0];
    if(file){if(file.size>3e6)throw new Error("Photo trop lourde (3 Mo maximum)");
      const path=Date.now()+"-"+file.name.replace(/[^a-zA-Z0-9.]/g,"_"),up=await db.storage.from("photos").upload(path,file);if(up.error)throw up.error;
      photo=db.storage.from("photos").getPublicUrl(path).data.publicUrl}
    const p={nom:$("#f-nom").value.trim(),titre:$("#f-titre").value.trim(),bio:$("#f-bio").value.trim(),tags:$("#f-tags").value.split(",").map(t=>t.trim()).filter(Boolean),photo_url:photo,ordre:+$("#f-ordre").value||0,actif:$("#f-actif").checked},id=$("#f-id").value;
    const {error}=id?await db.from("formateurs").update(p).eq("id",id):await db.from("formateurs").insert(p);if(error)throw error;
    fReset();toast("Formateur enregistré");loadAll();
  }catch(err){fail(err)}btn.disabled=false});
$("#fmList2").addEventListener("click",async e=>{const it=e.target.closest(".item");if(!it)return;const f=S.fm.find(x=>x.id===it.dataset.id);
  if(e.target.classList.contains("edit")){$("#f-id").value=f.id;$("#f-nom").value=f.nom;$("#f-titre").value=f.titre||"";$("#f-bio").value=f.bio||"";$("#f-tags").value=(f.tags||[]).join(", ");$("#f-ordre").value=f.ordre;$("#f-actif").checked=f.actif;$("#ff").dataset.photo=f.photo_url||"";$("#f-cancel").hidden=false;scrollTo({top:0,behavior:"smooth"})}
  if(e.target.classList.contains("del")){if(!confirm("Supprimer ce formateur ?"))return;const {error}=await db.from("formateurs").delete().eq("id",f.id);if(error)return fail(error);toast("Formateur supprimé");loadAll()}});
})();
