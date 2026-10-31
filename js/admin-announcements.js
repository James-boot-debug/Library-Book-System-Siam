import {db,$,esc,fmtDate,requireAdmin} from "./db.js";
if(await requireAdmin()){
 const form=$("#announcement-form"),root=$("#admin-announcements");
 async function load(){const {data,error}=await db.from("announcements").select("*").order("created_at",{ascending:false});root.innerHTML=error?`<p class="error">${esc(error.message)}</p>`:(data||[]).map(a=>`<article class="announcement-card"><div class="section-head"><span class="status ${a.published?"approved":"pending"}">${a.published?"Published":"Draft"}</span><button class="mini-btn danger-text" data-delete="${a.id}">Delete</button></div><span class="eyebrow">${fmtDate(a.created_at)}</span><h2>${esc(a.title)}</h2><p>${esc(a.message)}</p></article>`).join("")||'<p class="muted">No announcements yet.</p>';}
 form.addEventListener("submit",async e=>{e.preventDefault();const {error}=await db.from("announcements").insert({title:$("#announcement-title").value.trim(),message:$("#announcement-message").value.trim(),published:$("#announcement-published").checked});$("#announcement-message-status").textContent=error?error.message:"Announcement saved.";if(!error){form.reset();$("#announcement-published").checked=true;await load();}});
 root.addEventListener("click",async e=>{const id=e.target.dataset.delete;if(id&&confirm("Delete this announcement?")){const {error}=await db.from("announcements").delete().eq("id",id);if(error)alert(error.message);await load();}});
 await load();
}
