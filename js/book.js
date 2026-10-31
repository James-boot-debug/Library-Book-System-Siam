import {db,$,esc,locationText,floorLabel} from "./db.js";
import {mountFloorMap} from "./floormap.js";
const id=new URLSearchParams(location.search).get("id"), root=$("#book-detail");
if(!id){root.innerHTML='<p class="error">Book ID is missing.</p>';}
else {
 const {data:b,error}=await db.from("books").select("*").eq("id",id).single();
 if(error||!b){root.innerHTML='<p class="error">This book could not be found. It may have been removed.</p>';}
 else {
  document.title=`${b.title} · Library QR Finder`;
  root.innerHTML=`<div class="detail-layout"><div class="detail-cover">${b.cover_url?`<img src="${esc(b.cover_url)}" alt="">`:"▤"}</div><div><span class="tag">${esc(b.category||"General")}</span><h1>${esc(b.title)}</h1><p class="muted">by ${esc(b.author)}</p><p>${esc(b.description||"")}</p><div class="location-box"><span class="eyebrow">FIND THIS BOOK</span><h2>⌖ ${esc(floorLabel(b.floor))}</h2><p>${esc(locationText(b))}</p><p class="muted small">Follow the floor and shelf labels in the library.</p></div><p class="availability">${b.available_copies>0?`${b.available_copies} available copy/copies`:"Currently unavailable"}</p><a class="btn primary" href="/request.html?book=${encodeURIComponent(b.id)}">Request this book</a></div></div>`;
  // Floor map: opens on the book's floor and draws the route to its book store
  const mapEl=$("#floor-map");
  if(mapEl){mapEl.hidden=false;mountFloorMap(mapEl,b);}
 }
}
