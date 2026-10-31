import {db,$,esc,fmtDate,requireAdmin} from "./db.js";
if(await requireAdmin()){
 const [books,reqs,anns]=await Promise.all([
  db.from("books").select("id,available_copies"),
  db.from("book_requests").select("id,book_id,requester_name,status,created_at").order("created_at",{ascending:false}).limit(8),
  db.from("announcements").select("id")
 ]);
 $("#total-books").textContent=books.data?.length??"—";
 $("#available-copies").textContent=books.data?.reduce((s,b)=>s+(b.available_copies||0),0)??"—";
 $("#pending-requests").textContent=reqs.data?.filter(r=>r.status==="pending").length??"—";
 $("#total-announcements").textContent=anns.data?.length??"—";
 const ids=[...new Set((reqs.data||[]).map(r=>r.book_id))];const {data:titles}=ids.length?await db.from("books").select("id,title").in("id",ids):{data:[]};const map=Object.fromEntries((titles||[]).map(b=>[b.id,b.title]));
 $("#recent-requests").innerHTML=(reqs.data||[]).map(r=>`<tr><td>${esc(map[r.book_id]||"Book")}</td><td>${esc(r.requester_name)}</td><td>${fmtDate(r.created_at)}</td><td><span class="status ${r.status}">${r.status}</span></td></tr>`).join("")||'<tr><td colspan="4">No requests yet.</td></tr>';
}
