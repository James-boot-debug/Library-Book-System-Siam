import {db,$,esc,fmtDate,requireAdmin} from "./db.js";
if(await requireAdmin()){
 const root=$("#requests-table");const {data:reqs,error}=await db.from("book_requests").select("*").order("created_at",{ascending:false});
 if(error)root.innerHTML=`<tr><td colspan="6">${esc(error.message)}</td></tr>`;
 else {const ids=[...new Set((reqs||[]).map(r=>r.book_id))];const {data:books}=ids.length?await db.from("books").select("id,title").in("id",ids):{data:[]};const names=Object.fromEntries((books||[]).map(b=>[b.id,b.title]));
 root.innerHTML=(reqs||[]).map(r=>`<tr><td>${esc(names[r.book_id]||"Removed book")}</td><td>${esc(r.requester_name)}</td><td>${esc(r.requester_email)}</td><td>${esc(r.note||"—")}</td><td>${fmtDate(r.created_at)}</td><td><select data-status="${r.id}"><option value="pending" ${r.status==="pending"?"selected":""}>Pending</option><option value="approved" ${r.status==="approved"?"selected":""}>Approved</option><option value="rejected" ${r.status==="rejected"?"selected":""}>Rejected</option></select></td></tr>`).join("")||'<tr><td colspan="6">No requests yet.</td></tr>';
 root.addEventListener("change",async e=>{const id=e.target.dataset.status;if(!id)return;const {error}=await db.from("book_requests").update({status:e.target.value}).eq("id",id);if(error)alert(error.message);});
 }
}
