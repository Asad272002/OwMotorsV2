-- Keep direct authenticated Storage uploads aligned with the validated admin
-- actions. Existing objects are unaffected by lowering this upload ceiling.
update storage.buckets
set file_size_limit = 921600
where id = 'motorcycles';
