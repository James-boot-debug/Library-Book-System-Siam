// Admin: import many books at once from a CSV or Excel file.
import {db,$,esc,floorLabel} from "./db.js";
import {parseCSV,toObjects,validateRows} from "./book-import-core.js";

export function initBookImport({getBooks,reload}){
 const fileEl=$("#import-file"),drop=$("#import-drop"),skipEl=$("#import-skip"),run=$("#import-run"),
  summary=$("#import-summary"),errBox=$("#import-errors"),prevTable=$("#import-preview"),msg=$("#import-message");
 if(!fileEl)return;
 let objects=[],result=null,fileName="";

 async function readFile(file){
  const name=file.name.toLowerCase();
  if(/\.xlsx?$/.test(name)){
   const XLSX=await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");   // loaded only for Excel files
   const wb=XLSX.read(await file.arrayBuffer());
   return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:""});
  }
  return parseCSV(await file.text());
 }

 function analyse(){
  if(!objects.length&&!result){return;}
  result=validateRows(objects,getBooks(),skipEl.checked);
  const {ready,errors,dupes}=result;
  summary.innerHTML=`<strong>${esc(fileName)}</strong>: <span class="ok">✔ ${ready.length} ready to import</span>${dupes.length?` · <span class="warn">⚠ ${dupes.length} already in catalogue (skipped)</span>`:""}${errors.length?` · <span class="bad">✖ ${errors.length} with problems (not imported)</span>`:""}`;
  errBox.innerHTML=errors.length?`<ul class="import-errors">${errors.slice(0,25).map(e=>`<li><strong>Row ${e.row}</strong> · ${esc(e.title)} — ${esc(e.msg)}</li>`).join("")}${errors.length>25?`<li>…and ${errors.length-25} more.</li>`:""}</ul>`:"";
  if(ready.length){
   prevTable.classList.remove("hidden");
   prevTable.innerHTML=`<thead><tr><th>Row</th><th>Title</th><th>Author</th><th>Category</th><th>Location</th><th>Copies</th></tr></thead><tbody>${ready.slice(0,8).map(({row,payload:p})=>`<tr><td>${row}</td><td>${esc(p.title)}</td><td>${esc(p.author)}</td><td>${esc(p.category||"")}</td><td>${esc(floorLabel(p.floor))} · ${esc(p.shelf)}</td><td>${p.available_copies}/${p.total_copies}</td></tr>`).join("")}${ready.length>8?`<tr><td colspan="6" class="muted">…and ${ready.length-8} more</td></tr>`:""}</tbody>`;
  }else prevTable.classList.add("hidden");
  run.disabled=!ready.length;run.textContent=ready.length?`Import ${ready.length} book${ready.length===1?"":"s"}`:"Import books";
  msg.textContent="";
 }

 async function handle(file){
  if(!file)return;
  fileName=file.name;msg.textContent="Reading file…";run.disabled=true;
  try{
   const {objects:o,missing}=toObjects(await readFile(file));
   if(missing.length){result=null;objects=[];summary.innerHTML=`<span class="bad">✖ Missing column${missing.length>1?"s":""}: <strong>${missing.join(", ")}</strong>. Download the template to see the expected columns.</span>`;errBox.innerHTML="";prevTable.classList.add("hidden");msg.textContent="";return;}
   objects=o;result={};analyse();
  }catch(e){summary.innerHTML=`<span class="bad">✖ Could not read this file (${esc(e.message)}). Save it as CSV or .xlsx and try again.</span>`;errBox.innerHTML="";prevTable.classList.add("hidden");msg.textContent="";}
 }

 fileEl.addEventListener("change",()=>handle(fileEl.files[0]));
 skipEl.addEventListener("change",()=>{if(objects.length)analyse();});
 ["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("over");}));
 ["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("over");}));
 drop.addEventListener("drop",e=>handle(e.dataTransfer.files[0]));

 run.addEventListener("click",async()=>{
  if(!result?.ready?.length)return;
  run.disabled=true;let done=0;const rows=result.ready.map(r=>({...r.payload,updated_at:new Date().toISOString()}));
  for(let i=0;i<rows.length;i+=100){
   msg.textContent=`Importing… ${done}/${rows.length}`;
   const {error}=await db.from("books").insert(rows.slice(i,i+100));
   if(error){msg.innerHTML=`<span class="bad">Stopped after ${done} book${done===1?"":"s"}: ${esc(error.message)}</span>`;await reload();run.disabled=false;return;}
   done+=Math.min(100,rows.length-i);
  }
  msg.textContent=`✔ Imported ${done} book${done===1?"":"s"}.`;
  fileEl.value="";objects=[];result=null;prevTable.classList.add("hidden");errBox.innerHTML="";summary.innerHTML="";run.textContent="Import books";
  await reload();
 });
}
