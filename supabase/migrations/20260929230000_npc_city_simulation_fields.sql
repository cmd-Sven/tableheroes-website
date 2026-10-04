-- NPC Stadt-Simulation: Spalten + Startwerte für bestehende Zeilen
-- Überschreibt keine Namen/Beschreibungen/Bilder; setzt neue Spalten nur wenn noch leer.

ALTER TABLE public.npcs
  ADD COLUMN IF NOT EXISTS for_city_simulation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS city_influence_tier text,
  ADD COLUMN IF NOT EXISTS city_axis_loyal_criminal smallint,
  ADD COLUMN IF NOT EXISTS city_axis_greedy_altruist smallint,
  ADD COLUMN IF NOT EXISTS city_axis_pious_skeptic smallint,
  ADD COLUMN IF NOT EXISTS city_axis_superstition_reason smallint,
  ADD COLUMN IF NOT EXISTS city_deity text,
  ADD COLUMN IF NOT EXISTS city_faction_id text,
  ADD COLUMN IF NOT EXISTS city_agenda text,
  ADD COLUMN IF NOT EXISTS city_event_deck jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.npcs
  DROP CONSTRAINT IF EXISTS npcs_city_influence_tier_check;
ALTER TABLE public.npcs
  ADD CONSTRAINT npcs_city_influence_tier_check
  CHECK (
    city_influence_tier IS NULL
    OR city_influence_tier IN ('local', 'regional_economy', 'authority_faction', 'apex_global')
  );

ALTER TABLE public.npcs
  DROP CONSTRAINT IF EXISTS npcs_city_axis_loyal_criminal_check;
ALTER TABLE public.npcs
  ADD CONSTRAINT npcs_city_axis_loyal_criminal_check
  CHECK (city_axis_loyal_criminal IS NULL OR (city_axis_loyal_criminal BETWEEN -5 AND 5));

ALTER TABLE public.npcs
  DROP CONSTRAINT IF EXISTS npcs_city_axis_greedy_altruist_check;
ALTER TABLE public.npcs
  ADD CONSTRAINT npcs_city_axis_greedy_altruist_check
  CHECK (city_axis_greedy_altruist IS NULL OR (city_axis_greedy_altruist BETWEEN -5 AND 5));

ALTER TABLE public.npcs
  DROP CONSTRAINT IF EXISTS npcs_city_axis_pious_skeptic_check;
ALTER TABLE public.npcs
  ADD CONSTRAINT npcs_city_axis_pious_skeptic_check
  CHECK (city_axis_pious_skeptic IS NULL OR (city_axis_pious_skeptic BETWEEN -5 AND 5));

ALTER TABLE public.npcs
  DROP CONSTRAINT IF EXISTS npcs_city_axis_superstition_reason_check;
ALTER TABLE public.npcs
  ADD CONSTRAINT npcs_city_axis_superstition_reason_check
  CHECK (city_axis_superstition_reason IS NULL OR (city_axis_superstition_reason BETWEEN -5 AND 5));

COMMENT ON COLUMN public.npcs.for_city_simulation IS 'NPC ist für eine Stadtsimulation (z.B. Aurenfurt) relevant';
COMMENT ON COLUMN public.npcs.city_influence_tier IS 'Einflussradius: local | regional_economy | authority_faction | apex_global';
COMMENT ON COLUMN public.npcs.city_axis_loyal_criminal IS 'Loyal (−5) … Kriminell (+5)';
COMMENT ON COLUMN public.npcs.city_axis_greedy_altruist IS 'Habgierig (−5) … Gutmensch (+5)';
COMMENT ON COLUMN public.npcs.city_axis_pious_skeptic IS 'Gläubig (−5) … Ungläubig (+5)';
COMMENT ON COLUMN public.npcs.city_axis_superstition_reason IS 'Aberglaube (−5) … Aufgeklärt (+5)';
COMMENT ON COLUMN public.npcs.city_deity IS 'Zugehörige Gottheit (Pflicht bei Gläubig ≤ −1)';
COMMENT ON COLUMN public.npcs.city_faction_id IS 'Aurenfurt-Fraktions-ID aus aurenfurt-factions (text), null = keine';
COMMENT ON COLUMN public.npcs.city_agenda IS 'Individuelle Zielvorgabe für die Stadtsimulation';
COMMENT ON COLUMN public.npcs.city_event_deck IS 'Persönliches Ereigniskarten-Deck [{id,title,text,trigger,sortOrder}]';

-- Aurenfurt-Lore-Baum (Stadt + Nachfahren)
WITH RECURSIVE aurenfurt_tree AS (
  SELECT id FROM public.world_lore WHERE id = 'd0464d29-4c2d-4c94-a1ab-2d8c069674b3'
  UNION ALL
  SELECT w.id FROM public.world_lore w
  INNER JOIN aurenfurt_tree t ON w.parent_id = t.id
),
npc_ctx AS (
  SELECT
    n.id,
    lower(coalesce(n.role, '') || ' ' || coalesce(n.title, '') || ' ' || coalesce(n.description, '') || ' ' || coalesce(n.gm_notes, '')) AS blob,
    coalesce(l.name, lh.name, '') AS loc_name,
    CASE
      WHEN coalesce(n.current_location_id, n.home_location_id) IN (SELECT id FROM aurenfurt_tree) THEN true
      WHEN coalesce(l.name, lh.name, '') ILIKE '%aurenfurt%' THEN true
      WHEN coalesce(n.description, '') ILIKE '%aurenfurt%' THEN true
      WHEN coalesce(n.gm_notes, '') ILIKE '%aurenfurt%' THEN true
      WHEN coalesce(n.role, '') ILIKE '%aurenfurt%' THEN true
      WHEN coalesce(n.title, '') ILIKE '%aurenfurt%' THEN true
      ELSE false
    END AS is_aurenfurt_city
  FROM public.npcs n
  LEFT JOIN public.locations l ON l.id = n.current_location_id
  LEFT JOIN public.locations lh ON lh.id = n.home_location_id
)
UPDATE public.npcs n
SET
  for_city_simulation = c.is_aurenfurt_city,
  city_influence_tier = CASE
    WHEN c.blob ~ '(könig|herrscher|imperat|patriarch|allsehend|dämonischer heerführer|herzog)' THEN 'apex_global'
    WHEN c.blob ~ '(räuber|schmugg)' THEN 'local'
    WHEN c.blob ~ '(bürgermeister|kommandant|anführer|hochkurator|hoch vektor|erste magistra|gilden|meister der|hauptmann|militärführer|politiker|richter|paladin|magier|prophet)' THEN 'authority_faction'
    WHEN c.blob ~ '(händler|handler|kauf|goldschmied|schmied|wirt|gastwirt|handwerker|aufseher)' THEN 'regional_economy'
    ELSE 'local'
  END,
  city_axis_loyal_criminal = CASE
    WHEN c.blob ~ '(räuber|schmugg|krimin|rebell|harlekin|dämon|antagonist|schlangenfürst|schwarmhexe)' THEN 3
    WHEN c.blob ~ '(wache|wächter|garde|paladin|hauptmann|richter|kommandant|ordnung)' THEN -4
    WHEN c.blob ~ '(wirt|händler|handler|mittelsmann)' THEN 1
    ELSE 0
  END,
  city_axis_greedy_altruist = CASE
    WHEN c.blob ~ '(händler|handler|wirt|gastwirt|goldschmied|kauf)' THEN -2
    WHEN c.blob ~ '(heilerin|paladin|diplomat|gut|rose|hoffnung)' THEN 2
    WHEN c.blob ~ '(räuber|antagonist|dämon|schlangen)' THEN -3
    ELSE 0
  END,
  city_axis_pious_skeptic = CASE
    WHEN c.blob ~ '(prophet|hexen|patriarch|hochkurator|religiös|paladin|konklave|orden|gottheit|zenit)' THEN -3
    WHEN c.blob ~ '(kartograf|wissenschaft|forscher|magier|aufgeklärt)' THEN 2
    WHEN c.blob ~ '(dämon|malanthir|schwarmhexe)' THEN -2
    ELSE 0
  END,
  city_axis_superstition_reason = CASE
    WHEN c.blob ~ '(wahrsager|hexen|prophet|aberglauben|schwarm)' THEN -3
    WHEN c.blob ~ '(wissenschaft|forscher|kartograf|magister|bibliothek)' THEN 3
    WHEN c.blob ~ '(paladin|orden|richter)' THEN 1
    ELSE 0
  END,
  city_deity = CASE
    WHEN (
      CASE
        WHEN c.blob ~ '(prophet|hexen|patriarch|hochkurator|religiös|paladin|konklave|orden|gottheit|zenit)' THEN -3
        WHEN c.blob ~ '(dämon|malanthir|schwarmhexe)' THEN -2
        ELSE 0
      END
    ) <= -1 THEN
      CASE
        WHEN c.blob ~ '(malanthir|schwarm|dämon)' THEN 'Malanthir'
        WHEN c.blob ~ '(chromus|ordnung|konklave|gezählt)' THEN 'Chromus'
        WHEN c.blob ~ '(elysia|rose|hoffnung|paladin)' THEN 'Elysia'
        ELSE 'Unbekannt'
      END
    ELSE NULL
  END,
  city_faction_id = NULL,
  city_agenda = CASE
    WHEN c.blob ~ 'wirt|gastwirt' THEN 'Gäste binden und Informationen über den Tresen sammeln.'
    WHEN c.blob ~ 'schmied|goldschmied|handwerker' THEN 'Aufträge sichern und den eigenen Ruf in der Stadt halten.'
    WHEN c.blob ~ 'räuber|schmugg' THEN 'Beute machen und Verfolger abschütteln.'
    WHEN c.blob ~ 'wache|wächter|garde|hauptmann|kommandant' THEN 'Ordnung durchsetzen und den eigenen Posten absichern.'
    WHEN c.blob ~ 'anführer|bürgermeister|politiker' THEN 'Einfluss mehren und rivalisierende Kräfte ausspielen.'
    WHEN c.blob ~ 'händler|handler' THEN 'Seltene Waren profitabel bewegen und Netzwerke pflegen.'
    WHEN c.blob ~ 'heilerin' THEN 'Verletzte heilen und Vertrauen in der Gemeinschaft wahren.'
    WHEN c.blob ~ 'prophet|religiös|patriarch|hochkurator' THEN 'Glaubenslehre stärken und Anhänger führen.'
    WHEN c.blob ~ 'rebell' THEN 'Die Opposition stärken und Verstecke schützen.'
    WHEN c.blob ~ 'antagonist|dämon' THEN 'Macht ausbauen und Gegner schwächen.'
    ELSE 'Den eigenen Status und die unmittelbaren Interessen wahren.'
  END,
  city_event_deck = coalesce(n.city_event_deck, '[]'::jsonb)
FROM npc_ctx c
WHERE n.id = c.id
  AND n.city_influence_tier IS NULL;
