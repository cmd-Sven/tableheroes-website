-- ============================================================================
-- RLS Policy für campaign_members (Public Read für Slot Counting)
-- ============================================================================
-- Damit die Landing Page die Anzahl der akzeptierten Members abrufen kann,
-- müssen wir einen öffentlichen READ-Zugriff für campaign_members erlauben,
-- aber nur für Kampagnen, die veröffentlicht sind (is_published = true).

-- 1. Prüfen, ob RLS bereits aktiviert ist
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;

-- 2. Drop alte Policy falls sie existiert (um Duplikate zu vermeiden)
DROP POLICY IF EXISTS "campaign_members_public_read_for_published" ON campaign_members;

-- 3. Erstelle neue Policy: Public READ für campaign_members
-- Bedingung: Nur für Campaigns, die is_published = true haben
CREATE POLICY "campaign_members_public_read_for_published"
  ON campaign_members
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE is_published = true
    )
  );

-- ============================================================================
-- Testen der Policy (Optional)
-- ============================================================================
-- Um zu testen, ob die Policy funktioniert, führe folgende Queries aus:

-- Test 1: Count von akzeptierten Members für eine veröffentlichte Kampagne
-- SELECT COUNT(*) FROM campaign_members 
-- WHERE campaign_id = 'your-campaign-id' 
-- AND status = 'Accepted';

-- Test 2: Prüfe, ob die Policy angewendet wird
-- SELECT * FROM campaign_members LIMIT 5;
-- (Sollte nur Members von veröffentlichten Kampagnen zeigen)

-- ============================================================================
-- Notizen
-- ============================================================================
-- Diese Policy erlaubt:
-- ✅ Öffentliches Lesen von campaign_members für veröffentlichte Kampagnen
-- ✅ Landing Page kann Slot-Counts fetchen
-- ✅ Keine Authentifizierung erforderlich

-- Diese Policy verhindert:
-- ❌ Lesen von Members für nicht-veröffentlichte Kampagnen
-- ❌ Schreiben/Ändern von campaign_members ohne weitere Policies





