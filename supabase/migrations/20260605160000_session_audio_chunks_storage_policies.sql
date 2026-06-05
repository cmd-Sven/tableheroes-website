-- Storage policies for session audio chunks (GM upload via authenticated client or server admin).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-audio-chunks',
  'session-audio-chunks',
  false,
  524288000,
  ARRAY['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path: {campaign_id}/{session_id}/{chunk_index}.webm

DROP POLICY IF EXISTS "session_audio_chunks_select_campaign"
  ON storage.objects;
CREATE POLICY "session_audio_chunks_select_campaign"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'session-audio-chunks'
    AND EXISTS (
      SELECT 1
      FROM public.campaigns c
      LEFT JOIN public.campaign_members cm
        ON cm.campaign_id = c.id AND cm.user_id = auth.uid()
        AND cm.status IN ('Approved', 'Active')
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid() OR cm.user_id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "session_audio_chunks_insert_gm"
  ON storage.objects;
CREATE POLICY "session_audio_chunks_insert_gm"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'session-audio-chunks'
    AND EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_audio_chunks_update_gm"
  ON storage.objects;
CREATE POLICY "session_audio_chunks_update_gm"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'session-audio-chunks'
    AND EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'session-audio-chunks'
    AND EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_audio_chunks_delete_gm"
  ON storage.objects;
CREATE POLICY "session_audio_chunks_delete_gm"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'session-audio-chunks'
    AND EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
