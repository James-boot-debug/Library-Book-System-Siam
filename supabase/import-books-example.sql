-- ALTERNATIVE to the admin importer: insert books straight from the Supabase SQL Editor.
-- Rules: floor = '1' or '2'; shelf = book store letter (A-F on Floor 1, G-H on Floor 2).
-- (For a spreadsheet, you can also use Table Editor > books > Insert > Import data from CSV.)
insert into public.books
  (title, author, isbn, category, description, total_copies, available_copies, floor, section, shelf, row_label, position_label)
values
  ('Introduction to Algorithms', 'Thomas H. Cormen', '9780262046305', 'Computer Science', 'Algorithms textbook', 3, 3, '1', 'Algorithms', 'C', 'B', '03'),
  ('Clean Code',                 'Robert C. Martin', '9780132350884', 'Computer Science', null,                  2, 2, '1', 'Programming', 'C', 'A', '01'),
  ('Principles of Economics',    'N. Gregory Mankiw','9781305585126', 'Economics',        null,                  4, 4, '2', 'Economics',   'G', 'A', '05');
