import {db,$,esc,locationText,shortId} from "./db.js";
import {initShowcase} from "./hero-showcase.js";
let books=[];
const grid=$("#book-grid");
function render(){
 const q=$("#search").value.trim().toLowerCase(), cat=$("#category-filter").value;
 const filtered=books.filter(b=>(!cat||b.category===cat)&&[b.title,b.author,b.category,b.isbn,b.id].join(" ").toLowerCase().includes(q));
 $("#book-count").textContent=`${filtered.length} book${filtered.length===1?"":"s"} found`;
 grid.innerHTML=filtered.length?filtered.map(b=>`<article class="book-card"><a href="/book.html?id=${encodeURIComponent(b.id)}" class="cover">${b.cover_url?`<img src="${esc(b.cover_url)}" alt="">`:"▤"}</a><div class="book-card-body"><span class="tag">${esc(b.category||"General")}</span><h3><a href="/book.html?id=${encodeURIComponent(b.id)}">${esc(b.title)}</a></h3><p class="muted">${esc(b.author)}</p><p class="muted small">ID: ${shortId(b.id)}</p><p class="availability">${b.available_copies>0?"● Available":"● Currently unavailable"}</p><a class="text-link" href="/book.html?id=${encodeURIComponent(b.id)}">Find location →</a></div></article>`).join(""):`<p class="muted">No books match your search.</p>`;
}
const {data,error}=await db.from("books").select("*").order("title");
if(error) grid.innerHTML=`<p class="error">Could not load books. Check your Supabase URL, key, and schema.</p>`;
else {books=data||[];initShowcase(books);const cats=[...new Set(books.map(b=>b.category).filter(Boolean))].sort();$("#category-filter").innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");render();}
$("#search").addEventListener("input",render);$("#category-filter").addEventListener("change",render);
