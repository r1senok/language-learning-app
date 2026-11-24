begin;

-- Public read via the object URL. No client write policy is granted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('takku-tts', 'takku-tts', true, 1048576, array['audio/mpeg', 'text/plain'])
on conflict (id) do nothing;

commit;
