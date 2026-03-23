-- GM darf Sessions seiner Kampagnen erstellen, bearbeiten und löschen

-- INSERT: GM kann neue Sessions für eigene Kampagnen anlegen
CREATE POLICY "GM can insert sessions for own campaigns"
  ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = sessions.campaign_id AND c.gm_id = auth.uid()
    )
  );

-- UPDATE: GM kann Sessions seiner Kampagnen bearbeiten
CREATE POLICY "GM can update sessions for own campaigns"
  ON sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = sessions.campaign_id AND c.gm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = sessions.campaign_id AND c.gm_id = auth.uid()
    )
  );

-- DELETE: GM kann Sessions seiner Kampagnen löschen
CREATE POLICY "GM can delete sessions for own campaigns"
  ON sessions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = sessions.campaign_id AND c.gm_id = auth.uid()
    )
  );
