import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const $ = (selector, root=document) => root.querySelector(selector);
export const esc = (value="") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const fmtDate = value => new Date(value).toLocaleDateString();
export async function requireAdmin() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) { location.href = "/admin/login.html"; return null; }
  const { data: profile, error } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (error || profile?.role !== "admin") {
    await db.auth.signOut();
    location.href = "/admin/login.html?error=admin";
    return null;
  }
  $("#admin-email")?.replaceChildren(document.createTextNode(user.email || "Administrator"));
  $("#logout")?.addEventListener("click", async () => { await db.auth.signOut(); location.href="/admin/login.html"; });
  return user;
}
export const floorLabel = f => /^\d+$/.test(String(f ?? "").trim()) ? `Floor ${String(f).trim()}` : String(f ?? "");
export function locationText(book) {
  return [floorLabel(book.floor), book.section, `Shelf ${book.shelf}`, book.row_label ? `Row ${book.row_label}` : "", book.position_label ? `Position ${book.position_label}` : ""].filter(Boolean).join(" · ");
}
export function bookUrl(id) { return `${location.origin}/book.html?id=${encodeURIComponent(id)}`; }

export const shortId = id => String(id ?? "").slice(0, 8).toUpperCase();
export function categoryUrl(name) { return `${location.origin}/category.html?c=${encodeURIComponent(name)}`; }
