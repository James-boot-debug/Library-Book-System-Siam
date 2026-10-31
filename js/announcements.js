import {db,$,esc,fmtDate} from "./db.js";
const root=$("#announcements");const {data,error}=await db.from("announcements").select("*").eq("published",true).order("created_at",{ascending:false});
root.innerHTML=error?'<p class="error">Could not load announcements.</p>':data?.length?data.map(a=>`<article class="announcement-card"><span class="eyebrow">${fmtDate(a.created_at)}</span><h2>${esc(a.title)}</h2><p>${esc(a.message).replace(/\n/g,"<br>")}</p></article>`).join(""):'<p class="muted">There are no announcements yet.</p>';
