import {db,$} from "./db.js";
const id=new URLSearchParams(location.search).get("book");$("#book-id").value=id||"";
if(!id) $("#form-message").textContent="Open a book page first, then choose Request this book.";
$("#request-form").addEventListener("submit",async e=>{
 e.preventDefault();const message=$("#form-message");message.textContent="Sending…";
 const {error}=await db.from("book_requests").insert({book_id:id,requester_name:$("#requester-name").value.trim(),requester_email:$("#requester-email").value.trim(),note:$("#request-note").value.trim()||null});
 message.textContent=error?`Could not send request: ${error.message}`:"Your request has been sent. The library team will review it.";
 if(!error)e.target.reset();
});
