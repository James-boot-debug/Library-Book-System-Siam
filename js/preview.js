// "Look inside": shows a book's preview PDF (cover, contents, sample pages) with pdf.js.
// A strip of page thumbnails on the book page; click any page to open the full-screen viewer.
const PDFJS="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const WORKER="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
let libPromise;
function loadLib(){
 return libPromise??=new Promise((res,rej)=>{
  if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;return res(window.pdfjsLib);}
  const s=document.createElement("script");s.src=PDFJS;
  s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER;res(window.pdfjsLib);};
  s.onerror=()=>{libPromise=null;rej(new Error("Could not load the preview viewer."));};
  document.head.append(s);
 });
}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// Draws page n into canvas, scaled to fit maxW x maxH. Returns the pdf.js render task (cancel-able).
async function draw(pdf,n,canvas,maxW,maxH){
 const page=await pdf.getPage(n),v1=page.getViewport({scale:1});
 const fit=Math.min(maxW/v1.width,maxH?maxH/v1.height:Infinity),dpr=Math.min(window.devicePixelRatio||1,2);
 const vp=page.getViewport({scale:fit*dpr});
 canvas.width=Math.floor(vp.width);canvas.height=Math.floor(vp.height);
 canvas.style.width=Math.floor(vp.width/dpr)+"px";canvas.style.height=Math.floor(vp.height/dpr)+"px";
 return page.render({canvasContext:canvas.getContext("2d"),viewport:vp});
}
const safe=async t=>{try{await t.promise;}catch(e){/* cancelled or failed: ignore */}};

export async function mountPreview(container,url,title=""){
 if(!container)return;
 container.innerHTML=`<div class="pv-head"><div><span class="eyebrow">LOOK INSIDE</span><h2>Book preview</h2></div><button class="btn secondary pv-open-btn" type="button" disabled>📖 Open preview</button></div><div class="pv-strip" aria-label="Preview pages"><p class="muted">Loading preview…</p></div>`;
 const strip=container.querySelector(".pv-strip"),openBtn=container.querySelector(".pv-open-btn");
 let pdf;
 try{const lib=await loadLib();pdf=await lib.getDocument({url}).promise;}
 catch(e){container.innerHTML=`<div class="pv-head"><div><span class="eyebrow">LOOK INSIDE</span><h2>Book preview</h2></div><a class="btn secondary" href="${esc(url)}" target="_blank" rel="noopener">Open preview PDF</a></div><p class="muted small">The in-page preview could not load. You can open the PDF directly.</p>`;return;}
 const total=pdf.numPages,show=Math.min(total,8);
 strip.innerHTML=Array.from({length:show},(_,i)=>`<button class="pv-thumb" type="button" data-p="${i+1}" aria-label="Open page ${i+1}"><canvas></canvas><span>${i+1}</span></button>`).join("")+(total>show?`<button class="pv-thumb pv-more" type="button" data-p="${show+1}"><strong>+${total-show}</strong><span>more pages</span></button>`:"");
 openBtn.disabled=false;openBtn.textContent=`📖 Open preview (${total} page${total===1?"":"s"})`;
 const open=(p,trigger)=>openViewer(pdf,p,title,url,trigger);
 openBtn.addEventListener("click",()=>open(1,openBtn));
 strip.addEventListener("click",e=>{const b=e.target.closest(".pv-thumb");if(b)open(+b.dataset.p,b);});
 for(const b of strip.querySelectorAll(".pv-thumb:not(.pv-more)")){await safe(await draw(pdf,+b.dataset.p,b.querySelector("canvas"),170,230));}
}

function openViewer(pdf,start,title,url,trigger){
 const total=pdf.numPages;let p=Math.min(Math.max(start,1),total),zoom=false,task=null,seq=0;
 const el=document.createElement("div");el.className="pv-overlay";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Book preview");
 el.innerHTML=`<div class="pv-bar"><strong class="pv-title">${esc(title)}</strong><span class="pv-count" aria-live="polite"></span><button class="pv-btn pv-zoom" type="button" title="Zoom">🔍 Zoom</button><a class="pv-btn" href="${esc(url)}" target="_blank" rel="noopener">Open PDF</a><button class="pv-btn pv-close" type="button" aria-label="Close preview">✕</button></div><div class="pv-stage"><button class="pv-nav pv-prev" type="button" aria-label="Previous page">‹</button><div class="pv-canvas-wrap"></div><button class="pv-nav pv-next" type="button" aria-label="Next page">›</button></div><div class="pv-thumbs"></div>`;
 document.body.append(el);document.body.classList.add("pv-lock");
 const wrap=el.querySelector(".pv-canvas-wrap"),count=el.querySelector(".pv-count"),thumbs=el.querySelector(".pv-thumbs");

 thumbs.innerHTML=Array.from({length:total},(_,i)=>`<button class="pv-t" type="button" data-p="${i+1}" aria-label="Go to page ${i+1}"><canvas></canvas><span>${i+1}</span></button>`).join("");
 const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){io.unobserve(en.target);safe(draw(pdf,+en.target.dataset.p,en.target.querySelector("canvas"),64,90).then(t=>t));}}),{root:thumbs,rootMargin:"200px"});
 thumbs.querySelectorAll(".pv-t").forEach(b=>io.observe(b));

 async function go(n){
  p=Math.min(Math.max(n,1),total);const my=++seq;
  count.textContent=`${p} / ${total}`;
  thumbs.querySelectorAll(".pv-t").forEach(b=>b.classList.toggle("active",+b.dataset.p===p));
  thumbs.querySelector(`.pv-t[data-p="${p}"]`)?.scrollIntoView({block:"nearest",inline:"center"});
  el.querySelector(".pv-prev").disabled=p<=1;el.querySelector(".pv-next").disabled=p>=total;
  task?.cancel();
  const c=document.createElement("canvas");c.className=zoom?"zoomed":"";
  const k=zoom?2:1,W=Math.max(wrap.clientWidth-24,200)*k,H=Math.max(wrap.clientHeight-24,200)*k;
  const t=await draw(pdf,p,c,W,H);
  if(my!==seq){t.cancel();return;}
  task=t;wrap.replaceChildren(c);wrap.scrollTop=0;wrap.scrollLeft=0;
  await safe(t);
 }
 const close=()=>{task?.cancel();io.disconnect();document.removeEventListener("keydown",key);el.remove();document.body.classList.remove("pv-lock");trigger?.focus?.();};
 const key=e=>{if(e.key==="Escape")close();else if(e.key==="ArrowRight")go(p+1);else if(e.key==="ArrowLeft")go(p-1);};
 document.addEventListener("keydown",key);
 el.querySelector(".pv-close").onclick=close;
 el.querySelector(".pv-prev").onclick=()=>go(p-1);el.querySelector(".pv-next").onclick=()=>go(p+1);
 const toggleZoom=()=>{zoom=!zoom;el.classList.toggle("is-zoomed",zoom);go(p);};
 el.querySelector(".pv-zoom").onclick=toggleZoom;wrap.addEventListener("click",e=>{if(e.target.tagName==="CANVAS")toggleZoom();});
 thumbs.addEventListener("click",e=>{const b=e.target.closest(".pv-t");if(b)go(+b.dataset.p);});
 el.addEventListener("click",e=>{if(e.target===el||e.target.classList.contains("pv-stage"))close();});
 let x0=null;wrap.addEventListener("touchstart",e=>{x0=zoom?null:e.touches[0].clientX;},{passive:true});
 wrap.addEventListener("touchend",e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>50)go(dx<0?p+1:p-1);x0=null;});
 el.querySelector(".pv-close").focus();
 go(p);
}
