// Bulk import helpers (pure functions, no DOM): parse CSV, map columns, validate rows.
import {resolveBook,SHELF_OPTIONS} from "./floormap.js";

// ---- CSV parser: quotes, commas/newlines inside quotes, BOM, CRLF, auto-detects , ; or tab ----
export function parseCSV(text){
 text=String(text).replace(/^\uFEFF/,"");
 const first=text.split(/\r?\n/,1)[0]||"";
 const delim=[",",";","\t"].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
 const rows=[];let row=[],cell="",q=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(q){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=c;}
  else if(c==='"')q=true;
  else if(c===delim){row.push(cell);cell="";}
  else if(c==="\n"||c==="\r"){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell);rows.push(row);row=[];cell="";}
  else cell+=c;
 }
 if(cell!==""||row.length){row.push(cell);rows.push(row);}
 return rows;
}

const norm=h=>String(h??"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const ALIASES={
 title:["title","booktitle","bookname","name"],author:["author","authors","writer"],isbn:["isbn","isbn13","isbn10"],
 category:["category","subject","genre"],description:["description","summary"],cover_url:["coverurl","cover","image","imageurl"],preview_url:["previewurl","preview","previewpdf"],
 total_copies:["totalcopies","copies","quantity","qty"],available_copies:["availablecopies","available"],
 floor:["floor","level"],section:["section"],shelf:["shelf","bookstore","store"],row_label:["rowlabel","row"],position_label:["positionlabel","position"]
};
const REQUIRED=["title","author","floor","shelf"];

// table = array of arrays (first non-empty row = headers) -> {objects:[{row,data}], missing:[...]}
export function toObjects(table){
 const rows=table.map((r,i)=>({r,n:i+1})).filter(x=>x.r.some(c=>String(c??"").trim()!==""));
 if(!rows.length)return {objects:[],missing:REQUIRED};
 const head=rows[0].r.map(norm),idx={};
 for(const [field,names] of Object.entries(ALIASES)){const i=head.findIndex(h=>names.includes(h));if(i>=0)idx[field]=i;}
 const missing=REQUIRED.filter(f=>!(f in idx));
 const objects=rows.slice(1).map(({r,n})=>{const d={};for(const f in idx)d[f]=String(r[idx[f]]??"").trim();return {row:n,data:d};});
 return {objects,missing};
}

const isbnKey=s=>String(s??"").replace(/[^0-9Xx]/g,"").toLowerCase();
const nameKey=(t,a)=>`${String(t).trim().toLowerCase()}|${String(a).trim().toLowerCase()}`;

// existing = books already in the database. skipDuplicates: skip same ISBN or same title+author.
export function validateRows(objects,existing=[],skipDuplicates=true){
 const ready=[],errors=[],dupes=[];
 const seenIsbn=new Set(),seenName=new Set();
 if(skipDuplicates)for(const b of existing){if(b.isbn)seenIsbn.add(isbnKey(b.isbn));seenName.add(nameKey(b.title,b.author));}
 for(const {row,data:d} of objects){
  const bad=m=>errors.push({row,title:d.title||"(no title)",msg:m});
  if(!d.title){bad("Title is missing.");continue;}
  if(!d.author){bad("Author is missing.");continue;}
  const fl=String(d.floor).replace(/\D/g,"");
  if(!["1","2"].includes(fl)){bad(`Floor must be 1 or 2 (got “${d.floor}”).`);continue;}
  const shelf=String(d.shelf).trim().toUpperCase();
  const r=shelf?resolveBook({floor:fl,shelf}):{};
  if(!r.zone||String(r.floor)!==fl){bad(`Shelf “${d.shelf}” is not a book store on Floor ${fl} (use ${SHELF_OPTIONS[fl].join(", ")}).`);continue;}
  const total=d.total_copies===""||d.total_copies===undefined?1:Number(d.total_copies);
  if(!Number.isInteger(total)||total<0){bad(`Total copies must be a whole number (got “${d.total_copies}”).`);continue;}
  const avail=d.available_copies===""||d.available_copies===undefined?total:Number(d.available_copies);
  if(!Number.isInteger(avail)||avail<0||avail>total){bad(`Available copies must be a whole number from 0 to total copies (${total}).`);continue;}
  if(d.cover_url&&!/^https?:\/\//i.test(d.cover_url)){bad("Cover URL must start with http:// or https://.");continue;}
  if(d.preview_url&&!/^https?:\/\//i.test(d.preview_url)){bad("Preview URL must start with http:// or https://.");continue;}
  if(skipDuplicates){
   const ik=d.isbn?isbnKey(d.isbn):"",nk=nameKey(d.title,d.author);
   if((ik&&seenIsbn.has(ik))||seenName.has(nk)){dupes.push({row,title:d.title});continue;}
   if(ik)seenIsbn.add(ik);seenName.add(nk);
  }
  ready.push({row,payload:{
   title:d.title,author:d.author,isbn:d.isbn||null,category:d.category||null,description:d.description||null,cover_url:d.cover_url||null,
   total_copies:total,available_copies:avail,floor:fl,section:d.section||d.category||"General",shelf,
   row_label:d.row_label||null,position_label:d.position_label||null,...(d.preview_url?{preview_url:d.preview_url}:{})}});
 }
 return {ready,errors,dupes};
}
