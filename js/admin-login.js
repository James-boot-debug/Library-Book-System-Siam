import {db,$} from "./db.js";
const form=$("#login-form"),msg=$("#login-message");
form.addEventListener("submit",async e=>{
 e.preventDefault();msg.textContent="Signing in…";
 const {data,error}=await db.auth.signInWithPassword({email:$("#email").value,password:$("#password").value});
 if(error){msg.textContent="Sign-in failed. Check your email and password.";return;}
 const {data:profile,error:profileError}=await db.from("profiles").select("role").eq("id",data.user.id).single();
 if(profileError||profile?.role!=="admin"){await db.auth.signOut();msg.textContent="This account does not have administrator access.";return;}
 location.href="/admin/dashboard.html";
});
