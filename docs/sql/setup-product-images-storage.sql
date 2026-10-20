-- ============================================================================
-- SETUP: bucket de imagens de produtos (Supabase Storage)
-- Opcional — sem este setup a app guarda as fotos em base64 (funciona na mesma).
-- Com o bucket, as fotos ficam no CDN e a DB não incha.
-- ============================================================================

-- 1) Criar o bucket público (se ainda não existir)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 2) Policy de leitura pública
drop policy if exists "public read product-images" on storage.objects;
create policy "public read product-images" on storage.objects
  for select using (bucket_id = 'product-images');

-- 3) Policy de escrita apenas para autenticados
drop policy if exists "authenticated write product-images" on storage.objects;
create policy "authenticated write product-images" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
