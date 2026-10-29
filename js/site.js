(function(){
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LV=["Beginner","Pre-Intermediate","Intermediate","Upper-Intermediate","Advanced","Proficient"];
const IC={users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6M16 4.5a3.5 3.5 0 010 7M22 20c0-3-2-5-4-5.5"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/>',present:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M7 12l3-3 3 2 4-4"/>',phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',chat:'<path d="M4 5h16v11H9l-5 4z"/>',brief:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',book:'<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 012-2h13"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'};
window.IEC_UTIL={esc,LV,IC};
const ico=n=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]||IC.brief}</svg>`;
const cfg=window.IEC||{};
const db=(window.supabase&&cfg.url&&cfg.key&&!/VOTRE/.test(cfg.url+cfg.key))?window.supabase.createClient(cfg.url,cfg.key):null;
const params=new URLSearchParams(location.search);

// ---- Chapitres (page Formations)
async function chapitres(){
  const g=document.getElementById("chapGrid");if(!g||!db)return;
  const {data,error}=await db.from("chapitres").select("*").eq("actif",true).order("ordre");
  if(error||!data||!data.length)return;
  g.innerHTML=data.map((c,i)=>{
    const a=Math.min(c.niveau_min,c.niveau_max),b=Math.max(c.niveau_min,c.niveau_max);
    return `<article class="course" data-lv="${LV.slice(a,b+1).join(" ")}">${c.image_url?`<div class="cov pic"><img src="${esc(c.image_url)}" alt="" loading="lazy"></div>`:`<div class="cov b${i%4+1}">${ico(c.icone)}</div>`}<div class="cb"><div class="meta"><span class="tag" style="background:var(--navy);color:#fff">VIP 1:1</span><span class="tag">${LV[a]} → ${LV[b]}</span></div><h3>${esc(c.titre)}</h3><p>${esc(c.description)}</p><div class="cf"><b>VIP 1:1 · Google Meet</b><a class="btn sm" href="inscription.html?parcours=${encodeURIComponent(c.titre)}">S’inscrire</a></div></div></article>`}).join("");
}
// ---- Formateurs (page Formateurs)
let trainers=null;
async function formateurs(){
  if(!db)return;
  const {data,error}=await db.from("formateurs").select("*").eq("actif",true).order("ordre");
  if(error||!data||!data.length)return;trainers=data;
  const l=document.getElementById("fmList");if(!l)return;
  l.innerHTML=data.map(f=>`<div class="tr" style="margin-bottom:16px">${f.photo_url?`<img src="${esc(f.photo_url)}" alt="${esc(f.nom)}">`:`<div class="ph">${esc(f.nom.slice(0,1))}</div>`}<div><h2 style="font-size:1.9rem;margin-bottom:4px">${esc(f.nom)}</h2><p style="color:var(--mute);margin-bottom:8px">${esc(f.titre)}</p><p>${esc(f.bio)}</p><p style="margin-top:8px">${(f.tags||[]).map(t=>`<span class="tag">${esc(t)}</span> `).join("")}</p><p><a class="btn" style="margin-top:16px" href="inscription.html?formateur=${encodeURIComponent(f.nom)}">Suivre ses cours</a></p></div></div>`).join("")+`<div class="tr soon"><p>De nouveaux formateurs rejoindront bientôt la plateforme.</p></div>`;
}
// ---- Formulaire d'inscription
async function form(){
  const f=document.getElementById("insForm");if(!f)return;
  const pc=document.getElementById("pc"),nv=document.getElementById("nv"),fm=document.getElementById("fm");
  if(db){
    const [c,t]=await Promise.all([db.from("chapitres").select("titre").eq("actif",true).order("ordre"),db.from("formateurs").select("nom").eq("actif",true).order("ordre")]);
    if(c.data&&c.data.length&&pc)pc.innerHTML='<option>Je ne sais pas encore</option>'+c.data.map(x=>`<option>${esc(x.titre)}</option>`).join("");
    if(t.data&&t.data.length&&fm){fm.innerHTML=t.data.map(x=>`<option>${esc(x.nom)}</option>`).join("");if(t.data.length>1)document.getElementById("fmw").hidden=false}
  }
  const q=params.get("parcours"),v=params.get("niveau"),w=params.get("formateur");
  if(q&&pc)[...pc.options].forEach(o=>{if(o.value===q)pc.value=q});
  if(v&&nv)[...nv.options].forEach(o=>{if(o.value.startsWith(v))nv.value=o.value});
  if(w&&fm)[...fm.options].forEach(o=>{if(o.value===w)fm.value=w});
  f.addEventListener("submit",async e=>{
    if(!db)return; // sans Supabase : envoi classique (FormSubmit)
    e.preventDefault();
    const d=new FormData(f),msg=document.getElementById("fmsg"),btn=f.querySelector("button[type=submit]");
    if(d.get("_honey"))return;
    btn.disabled=true;btn.textContent="Envoi…";msg.textContent="";
    const row={prenom:d.get("prenom").trim(),nom:d.get("nom").trim(),email:d.get("email").trim(),telephone:d.get("telephone").trim(),parcours:d.get("parcours"),niveau:d.get("niveau"),objectif:(d.get("objectif")||"").trim()||null,formateur:d.get("formateur")};
    const {error}=await db.from("inscriptions").insert(row);
    if(error){msg.textContent="Une erreur est survenue. Réessayez ou appelez le 0778 330153.";btn.disabled=false;btn.textContent="Envoyer mon inscription"}
    else location.href="merci.html";
  });
}
// ---- Filtre par niveau
document.querySelectorAll(".filters button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".filters button").forEach(x=>x.classList.remove("on"));b.classList.add("on");
  document.querySelectorAll(".course").forEach(e=>e.hidden=b.dataset.l!="all"&&!e.dataset.lv.split(" ").includes(b.dataset.l));
}));
chapitres();formateurs();form();
})();
