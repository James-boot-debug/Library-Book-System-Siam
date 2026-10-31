import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm";
import {db,$,esc,locationText,bookUrl,categoryUrl,requireAdmin} from "./db.js";
import {resolveBook} from "./floormap.js";
import {initBookImport} from "./book-import.js";
import {attachShelfPicker} from "./shelfpicker.js";
if(await requireAdmin()){
 const form=$("#book-form"),panel=$("#book-form-panel"),tbody=$("#books-table");let books=[];
 const fields=["title","author","isbn","category","total-copies","available-copies","floor","section","shelf","row-label","position-label","description","cover-url"];
 const val=id=>$("#"+id).value.trim();
 const picker=attachShelfPicker($("#floor"),$("#shelf")); // floor + shelf become dropdowns tied to the map
 function clearForm(){form.reset();$("#book-id").value="";$("#total-copies").value=1;$("#available-copies").value=1;picker?.set("","");$("#book-form-title").textContent="Add a book";panel.classList.add("hidden");$("#book-message").textContent="";}
 function render(){const q=$("#book-search").value.toLowerCase();const rows=books.filter(b=>[b.title,b.author,b.category].join(" ").toLowerCase().includes(q));tbody.innerHTML=rows.map(b=>`<tr><td><strong>${esc(b.title)}</strong><br><span class="muted small">${esc(b.author)}</span></td><td>${esc(locationText(b))}</td><td>${b.available_copies}/${b.total_copies}</td><td class="actions"><button class="mini-btn" data-edit="${b.id}">Edit</button><button class="mini-btn" data-qr="${b.id}">QR Code</button><button class="mini-btn danger-text" data-delete="${b.id}">Delete</button></td></tr>`).join("")||'<tr><td colspan="4">No books found.</td></tr>';}
 async function load(){const {data,error}=await db.from("books").select("*").order("created_at",{ascending:false});if(error){tbody.innerHTML=`<tr><td colspan="4">${esc(error.message)}</td></tr>`;return;}books=data||[];render();renderCategories();}
 // ----- category QR codes -----
 const catList=$("#category-list");let cats=[];
 async function labelCanvas(titleText,url){
  const qr=document.createElement("canvas");await QRCode.toCanvas(qr,url,{width:300,margin:1,color:{dark:"#0a1a35",light:"#ffffff"}});
  const W=380,H=500,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  g.fillStyle="#fff";g.fillRect(0,0,W,H);g.fillStyle="#c9a24b";g.fillRect(0,0,W,10);g.fillRect(0,H-10,W,10);
  g.textAlign="center";g.fillStyle="#0a1a35";let size=34;g.font=`700 ${size}px Georgia,serif`;
  while(g.measureText(titleText).width>W-40&&size>18){size-=2;g.font=`700 ${size}px Georgia,serif`;}
  let t=titleText;while(g.measureText(t).width>W-40&&t.length>3)t=t.slice(0,-2);if(t!==titleText)t=t.trimEnd()+"…";
  g.fillText(t,W/2,66);g.font="15px Arial,sans-serif";g.fillStyle="#6b7385";g.fillText("Scan to browse the books in this section",W/2,94);
  g.drawImage(qr,40,116,300,300);g.font="600 14px Arial,sans-serif";g.fillStyle="#9a7220";g.fillText("Library QR Finder · Siam University",W/2,456);
  return c;
 }
 function renderCategories(){
  const m=new Map();
  books.forEach(b=>{const n=b.category;if(!n)return;const e=m.get(n)||{name:n,n:0,t:{}};e.n++;const r=resolveBook(b);if(r.zone){const k=`${r.floor}:${r.zone.id}`;e.t[k]=(e.t[k]||0)+1;}m.set(n,e);});
  cats=[...m.values()].sort((a,b)=>a.name.localeCompare(b.name));
  catList.innerHTML=cats.length?cats.map((c,i)=>{const top=Object.entries(c.t).sort((a,b)=>b[1]-a[1])[0];const where=top?` · Floor ${top[0].split(":")[0]} · Book store ${top[0].split(":")[1]}`:"";return `<div class="cat-item"><div><strong>${esc(c.name)}</strong><span class="muted small">${c.n} book${c.n===1?"":"s"}${esc(where)}</span></div><button class="mini-btn" data-cat="${i}">QR Code</button></div>`;}).join(""):'<p class="muted">Add books with a category to create category QR codes.</p>';
 }
 catList.addEventListener("click",async e=>{
  const i=e.target.dataset.cat;if(i===undefined)return;const c=cats[+i];
  $("#qr-heading").textContent="Category QR code";$("#qr-book-title").textContent=`${c.name} · ${c.n} book${c.n===1?"":"s"}`;
  const canvas=await labelCanvas(c.name,categoryUrl(c.name));$("#qr-output").replaceChildren(canvas);$("#qr-modal").classList.remove("hidden");
  $("#download-qr").onclick=()=>{const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=`category-${c.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}-qr.png`;a.click();};
 });
 $("#new-book").onclick=()=>{clearForm();panel.classList.remove("hidden");panel.scrollIntoView({behavior:"smooth"});};
 $("#cancel-edit").onclick=clearForm;$("#book-search").oninput=render;
 form.addEventListener("submit",async e=>{e.preventDefault();const total=Number(val("total-copies")),available=Number(val("available-copies"));if(available>total){$("#book-message").textContent="Available copies cannot exceed total copies.";return;}
  const payload={title:val("title"),author:val("author"),isbn:val("isbn")||null,category:val("category")||null,total_copies:total,available_copies:available,floor:val("floor"),section:val("section"),shelf:val("shelf"),row_label:val("row-label")||null,position_label:val("position-label")||null,description:val("description")||null,cover_url:val("cover-url")||null,updated_at:new Date().toISOString()};
  const id=val("book-id");const result=id?await db.from("books").update(payload).eq("id",id):await db.from("books").insert(payload);
  $("#book-message").textContent=result.error?result.error.message:"Saved successfully.";if(!result.error){clearForm();await load();}
 });
 tbody.addEventListener("click",async e=>{
  const edit=e.target.dataset.edit,del=e.target.dataset.delete,qr=e.target.dataset.qr;
  if(edit){const b=books.find(x=>x.id===edit);$("#book-id").value=b.id;const ids=["title","author","isbn","category","total-copies","available-copies","floor","section","shelf","row-label","position-label","description","cover-url"];const vals=[b.title,b.author,b.isbn,b.category,b.total_copies,b.available_copies,b.floor,b.section,b.shelf,b.row_label,b.position_label,b.description,b.cover_url];ids.forEach((id,i)=>$("#"+id).value=vals[i]??"");picker?.set(b.floor,b.shelf);$("#book-form-title").textContent="Edit book";panel.classList.remove("hidden");panel.scrollIntoView({behavior:"smooth"});}
  if(del&&confirm("Delete this book? Related requests will also be deleted.")){const {error}=await db.from("books").delete().eq("id",del);if(error)alert(error.message);await load();}
  if(qr){const b=books.find(x=>x.id===qr);$("#qr-heading").textContent="Book QR code";$("#qr-book-title").textContent=b.title;const canvas=document.createElement("canvas");await QRCode.toCanvas(canvas,bookUrl(b.id),{width:260,margin:2});$("#qr-output").replaceChildren(canvas);$("#qr-modal").classList.remove("hidden");$("#download-qr").onclick=()=>{const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=`book-${b.id}-qr.png`;a.click();};}
 });
 $("#close-qr").onclick=()=>$("#qr-modal").classList.add("hidden");
 initBookImport({getBooks:()=>books,reload:load});
 await load();
}
