# Library QR Finder

A lightweight library book-finding website built with **HTML, CSS, vanilla JavaScript, Supabase, and Vercel**.

## Features

### Public pages (no account needed)
- Search the catalogue by title, author, or category.
- Open a book's details and see its floor, section, shelf, row, and position.
- Scan a printed QR code with a phone camera to open that book's location.
- Submit a book request.
- Read library announcements.

### Admin pages (login required)
- Dashboard summary.
- Add, edit, and delete books.
- Generate and download a QR code for each book.
- Review, approve, or reject book requests.
- Publish and delete announcements.

## 1. Create the Supabase project

1. Create a project at https://supabase.com/
2. Open **SQL Editor** and run the complete `supabase/schema.sql` file.
3. In Supabase **Authentication > Users**, create an administrator user with email and password. Disable public sign-ups in Authentication settings.
4. Copy that user's UUID.
5. In SQL Editor, run the following, replacing the UUID:

```sql
insert into public.profiles (id, role)
values ('PASTE-ADMIN-USER-UUID-HERE', 'admin')
on conflict (id) do update set role = 'admin';
```

6. Copy the Project URL and anon/publishable key from **Project Settings > API**.

## 2. Configure the project

1. Open `js/config.js`.
2. Replace `https://YOUR-PROJECT.supabase.co` with your Supabase Project URL.
3. Replace `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY` with your Supabase anon/publishable key.
4. Install Node.js (LTS), then run:

```bash
npm install
npm run dev
```

4. Open the local URL shown by Vercel (usually http://localhost:3000).

The browser uses the public Supabase anon key. This is expected. **Never put a Supabase service-role key in browser code or GitHub.** Row Level Security (RLS) protects the database. The anon key is designed to be public; the database policies are the security boundary.

## 3. Deploy to Vercel

1. Create a GitHub repository and upload all project files.
2. In Vercel, choose **Add New > Project** and import that GitHub repository.
3. In Vercel **Project Settings > Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Deploy. Every future push to the connected GitHub branch can trigger a new deployment.

## 4. Print QR codes

1. Sign in at `/admin/login.html`.
2. Open **Manage Books**, add a book, and save it.
3. Click **QR Code** on that book and download the PNG.
4. Print and attach the QR code to the physical book or shelf label.

The QR code contains the deployed book page URL with the book's database ID. If the admin changes the shelf location later, the existing QR code still works.

## 5. Important notes

- Use HTTPS in production so phone camera scanning works.
- QR scanning uses the device camera and asks the user for permission.
- Public users can read the catalogue and submit requests; only authenticated admins can change books, requests, or announcements.
- This starter project does not include a turn-by-turn indoor positioning system. It shows the floor/section/shelf details entered by the admin. To show a true path, add an uploaded floor map and mapped shelf coordinates in a later version.
- Set your Supabase project's site URL and allowed redirect URLs to your Vercel domain under **Authentication > URL Configuration**.
- Keep backups of your database. Test the RLS policies with a non-admin account before using real library data.

## 6. Floor maps and routes

Each book page shows an interactive map (Floor 1 / Floor 2) with a highlighted route from the entrance to the book's book store, and a pin on the destination. Scanning a QR code opens the book page on the correct floor automatically.

- Map layouts live in `js/floormap.js` (traced from the two floor plans). Floor 1 book stores are **A-F**, Floor 2 book stores are **G-H**. Routes are calculated automatically around walls, so after moving or resizing a room you only edit its coordinates.
- In **Admin > Manage books**, Floor and Book store are dropdowns, so only valid locations can be saved. Use Section, Row and Position for finer detail.
- Floor 2 routes start at the Floor 2 arrival point (stairs/lift). The Floor 1 plan does not show the stairs yet.
- Preview any location without the database: `/map?floor=2&shelf=H`.
- Optional: run `supabase/validate-shelves.sql` after fixing existing books to make the database reject floor/shelf values that are not on the map.

## 7. Category QR codes

In **Admin > Manage books**, the **Category QR codes** panel lists every category with its book count and book store. Click **QR Code** to download a printable label. Scanning it opens `/category?c=<name>`, which lists only that category's books and lets visitors search by book name, author, ISBN or book ID (the 8-character ID shown on each card). Print one per book store and attach it to the shelf. Book QR codes still work as before.

The header logo is `img/siam-university-icon.svg`; replace that file to change it everywhere.

## 8. Bulk import books

In **Admin > Manage books > Import many books from a file**, upload a CSV or Excel (.xlsx) file and click Import. Start from `templates/books-template.csv` (also downloadable from that panel). Required columns: `title`, `author`, `floor` (1 or 2), `shelf` (book store A-F on Floor 1, G-H on Floor 2). Rows with problems are listed with the reason and are not imported; books already in the catalogue (same ISBN or same title + author) are skipped by default. Prefer SQL? See `supabase/import-books-example.sql`.

## 9. Book preview ("Look inside")

Each book can have a preview PDF (cover, contents, preface, sample pages). On the book page, visitors see a strip of page thumbnails and can open a full-screen viewer (next/previous, keyboard arrows, swipe, zoom, page thumbnails).

1. Run `supabase/add-book-preview.sql` once in the Supabase SQL Editor (adds the `preview_url` column and a public `book-previews` storage bucket where only admins can upload).
2. In **Admin > Manage books**, add or edit a book and choose a PDF under **Book preview PDF** (max 50 MB). Replace or remove it any time from the same form.
3. Bulk import: an optional `preview_url` column (a link to a PDF) is accepted.

Books without a preview simply do not show the section.
