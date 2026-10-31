import {$} from "./db.js";
let scanner=null;
const msg=$("#scan-message"), start=$("#start-scan"), stop=$("#stop-scan");
start.addEventListener("click",async()=>{
 if(!window.Html5Qrcode){msg.textContent="Scanner library did not load. Try your phone's camera app.";return;}
 scanner=new Html5Qrcode("reader");start.disabled=true;msg.textContent="Starting camera…";
 try{
  await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:240,height:240}},async text=>{
   if(scanner){await scanner.stop();scanner=null;}location.href=text;
  },()=>{});
  stop.disabled=false;msg.textContent="Camera is active. Point it at a book QR code.";
 }catch(e){msg.textContent="Could not start camera. Allow camera permission and use this page over HTTPS.";start.disabled=false;}
});
stop.addEventListener("click",async()=>{if(scanner){await scanner.stop();scanner=null;}start.disabled=false;stop.disabled=true;msg.textContent="Scanner stopped.";});
