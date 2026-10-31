// Hero frame: shows 5 random books from the database, one at a time (auto-rotates, with dots + Shuffle).
import {esc,floorLabel} from "./db.js";
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const pick=all=>{const ok=b=>b.available_copies>0;return [...shuffle(all.filter(ok)),...shuffle(all.filter(b=>!ok(b)))].slice(0,5);}; // prefers available books
const GRADS=["linear-gradient(145deg,#c9a24b,#5a3d0a)","linear-gradient(145deg,#2f5fb3,#0a1a35)","linear-gradient(145deg,#8b2f4b,#2a0d1a)","linear-gradient(145deg,#2d7a62,#0b2b22)","linear-gradient(145deg,#6a4cb0,#1a1040)"];
const INTERVAL=5000;

export function initShowcase(all,root=document.getElementById("hero-showcase")){
 if(!root||!all||!all.length)return;           // no books: keep the static placeholder
 const still=matchMedia("(prefers-reduced-motion: reduce)").matches;
 let list=pick(all),cur=0,timer;
 root.style.setProperty("--iv",INTERVAL+"ms");
 const slide=(b,k)=>`<a class="sc-slide" href="/book.html?id=${encodeURIComponent(b.id)}" data-i="${k}"><div class="sc-cover" style="--g:${GRADS[k%GRADS.length]}"><span class="sc-spine"></span><strong>${esc(b.title)}</strong>${b.cover_url?`<img src="${esc(b.cover_url)}" alt="" onerror="this.remove()">`:""}</div><div class="sc-info"><span class="tag">${esc(b.category||"General")}</span><h3>${esc(b.title)}</h3><p>by ${esc(b.author)}</p><p class="sc-avail${b.available_copies>0?"":" off"}">${b.available_copies>0?"● Available now":"● Currently unavailable"}</p><span class="sc-loc">⌖ ${esc(floorLabel(b.floor))} · Shelf ${esc(b.shelf)}</span><span class="sc-go">Find location →</span></div></a>`;
 function build(){
  root.classList.toggle("still",still);
  root.innerHTML=`<div class="sc-top"><span class="sc-label">✦ Featured books</span><button class="sc-shuffle" type="button">↻ Shuffle</button></div><div class="sc-stage">${list.map(slide).join("")}</div><div class="sc-dots">${list.map((_,k)=>`<button class="sc-dot" type="button" data-i="${k}" aria-label="Show book ${k+1}"></button>`).join("")}</div>`;
  go(0);
 }
 function go(n){
  clearTimeout(timer);cur=(n+list.length)%list.length;
  root.querySelectorAll(".sc-slide").forEach((s,k)=>{const on=k===cur;s.classList.toggle("active",on);s.setAttribute("aria-hidden",on?"false":"true");s.tabIndex=on?0:-1;});
  root.querySelectorAll(".sc-dot").forEach((d,k)=>{d.classList.remove("active");if(k===cur){void d.offsetWidth;d.classList.add("active");}}); // restarts the progress bar
  if(!still&&list.length>1)timer=setTimeout(()=>go(cur+1),INTERVAL);
 }
 root.addEventListener("click",e=>{
  const dot=e.target.closest(".sc-dot");if(dot){go(+dot.dataset.i);return;}
  if(e.target.closest(".sc-shuffle")){list=pick(all);build();}
 });
 const hold=()=>{clearTimeout(timer);root.classList.add("paused");};
 const resume=()=>{root.classList.remove("paused");go(cur);};
 root.addEventListener("mouseenter",hold);root.addEventListener("mouseleave",resume);
 root.addEventListener("focusin",hold);root.addEventListener("focusout",resume);
 build();
}
