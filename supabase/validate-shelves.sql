-- OPTIONAL: run in Supabase SQL Editor AFTER every existing book has valid values.
-- 1) See rows that would break the rules:
select id, title, floor, section, shelf from public.books
where floor not in ('1','2')
   or shelf !~ '^[A-H]'
   or (floor = '1' and shelf !~ '^[A-F]')
   or (floor = '2' and shelf !~ '^[GH]');

-- 2) Fix them (example), then add the rules:
-- update public.books set floor = '1', section = 'C', shelf = 'C1' where id = '...';

alter table public.books
  add constraint books_map_location_check check (
    (floor = '1' and shelf ~ '^[A-F]') or (floor = '2' and shelf ~ '^[GH]')
  );
