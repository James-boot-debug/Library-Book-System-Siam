// Category page: opened by scanning a category QR code. Lists only that category's books,
// searchable by book name, author, ISBN or book ID.
import {db,$,esc,floorLabel,shortId} from "./db.js";
import {mountFloorMap,resolveBook} from "./floormap.js";
const name=(new URLSearchParams(location.search).get("c")||"").trim();
const grid=$("#cat-grid"),count=$("#cat-count"),title=$("#cat-title"),search=$("#cat-search");
let books=[];
function render(){
 const q=search.value.trim().toLowerCase();
 const rows=books.filter(b=>!q||[b.title,b.author,b.isbn,b.id,shortId(b.id)].join(" ").toLowerCase().includes(q));
 count.textContent=q?`${rows.length} of ${books.length} book${books.length===1?"":"s"} match`:`${books.length} book${books.length===1?"":"s"} in this category`;
 grid.innerHTML=rows.length?rows.map(b=>`<article class="book-card"><a href="/book.html?id=${encodeURIComponent(b.id)}" class="cover">${b.cover_url?`<img src="${esc(b.cover_url)}" alt="">`:"▤"}</a><div class="book-card-body"><span class="tag">ID ${shortId(b.id)}</span><h3><a href="/book.html?id=${encodeURIComponent(b.id)}">${esc(b.title)}</a></h3><p class="muted">${esc(b.author)}</p><p class="muted small">⌖ ${esc(floorLabel(b.floor))} · Shelf ${esc(b.shelf)}</p><p class="availability">${b.available_copies>0?"● Available":"● Currently unavailable"}</p><a class="text-link" href="/book.html?id=${encodeURIComponent(b.id)}">Find location →</a></div></article>`).join(""):`<p class="muted">No books match your search.</p>`;
}
if(!name){
 title.textContent="No category selected";count.textContent="";$("#cat-tools").hidden=true;
 grid.innerHTML='<p class="error">This QR code or link has no category. Go back and choose a category.</p>';
}else{
 title.textContent=name;document.title=`${name} · Library QR Finder`;
 const {data,error}=await db.from("books").select("*").eq("category",name).order("title");
 if(error){count.textContent="";grid.innerHTML='<p class="error">Could not load books. Please try again.</p>';}
 else if(!data||!data.length){count.textContent="0 books";$("#cat-tools").hidden=true;grid.innerHTML='<p class="muted">No books found in this category.</p>';}
 else{
  books=data;render();search.addEventListener("input",render);
  // map: show the book store where most of this category's books are shelved
  const tally={};books.forEach(b=>{const r=resolveBook(b);if(r.zone){const k=r.floor+":"+r.zone.id;tally[k]=(tally[k]||0)+1;}});
  const top=Object.entries(tally).sort((a,b)=>b[1]-a[1])[0];
  if(top){const [f,z]=top[0].split(":");mountFloorMap($("#floor-map"),{floor:f,shelf:z});$("#map-details").hidden=false;}
 }
}
