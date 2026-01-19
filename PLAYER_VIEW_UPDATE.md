# 🎭 Player View für NPCs & Fraktionen - Implementation Complete

Das **Player View System** wurde erfolgreich implementiert! Spieler können jetzt NPCs und Fraktionen sehen, die vom GM als "revealed" markiert wurden – ohne Zugriff auf GM-Notizen oder Edit-Funktionen.

---

## ✅ Was wurde implementiert:

### **1. Data Fetching für alle User**

**Campaign Page (`page.tsx`):**
```typescript
// VORHER (❌):
let npcs: any[] = [];
let factions: any[] = [];
if (isGM) {
  npcs = await getNPCs(id);
  factions = await getFactionsWithMembers(id);
}

// NACHHER (✅):
// RLS filtert automatisch:
// - GMs sehen alles
// - Players sehen nur is_revealed=true
const npcs = await getNPCs(id);
const factions = await getFactionsWithMembers(id);
```

**Key Point:** Row Level Security (RLS) Policies im Backend filtern automatisch basierend auf `is_revealed` und User-Rolle!

---

### **2. Tab-System für Player aktiviert**

**CampaignTabs.tsx:**
```typescript
// VORHER (❌):
...(isGM && npcsContent ? [{ id: "npcs", ... }] : []),
...(isGM && factionsContent ? [{ id: "factions", ... }] : []),

// NACHHER (✅):
...(npcsContent ? [{ id: "npcs", ... }] : []),        // ← Für alle User
...(factionsContent ? [{ id: "factions", ... }] : []), // ← Für alle User
...(isGM ? [{ id: "members", ... }] : []),            // ← Nur für GM
```

**Resultat:**
- ✅ **Übersicht** - Alle User
- ✅ **Sessions** - Alle User
- ✅ **NPCs** - Alle User (gefiltert nach revealed)
- ✅ **Fraktionen** - Alle User (gefiltert nach revealed)
- ✅ **Mitglieder** - Nur GM

---

### **3. Management-Komponenten mit isGM Prop**

**NPCsManagement.tsx & FactionsManagement.tsx:**

```typescript
type Props = {
  campaignId: string;
  npcs: NPC[];
  factions: Faction[];
  isGM: boolean;  // ← NEU!
};
```

**Features basierend auf isGM:**

#### **GM Mode (isGM = true):**
- ✅ "Neuer NPC" / "Neue Fraktion" Button sichtbar
- ✅ Info-Box sichtbar (Hilfetext für GMs)
- ✅ Edit/Delete/Reveal Actions auf Cards
- ✅ Modal zum Erstellen/Bearbeiten verfügbar

#### **Player Mode (isGM = false):**
- ❌ Kein "Neuer NPC" / "Neue Fraktion" Button
- ❌ Keine Info-Box
- ❌ Keine Edit/Delete/Reveal Actions
- ❌ Kein Modal
- ✅ Nur Read-Only Ansicht

---

### **4. Card-Komponenten - Read-Only Mode**

**NPCCard.tsx & FactionCard.tsx:**

Die Cards unterstützen bereits `isGM` Props und verbergen automatisch:

```typescript
{/* GM Actions - Nur für GM */}
{isGM && (
  <div className="flex items-center gap-1">
    <button onClick={handleToggleReveal}>...</button>  // ← Reveal Toggle
    <button onClick={() => onEdit(npc)}>...</button>   // ← Edit
    <button onClick={handleDelete}>...</button>        // ← Delete
  </div>
)}

{/* GM Notes - Nur für GM */}
{isGM && npc.gm_notes && (
  <div>
    <button onClick={() => setShowGMNotes(!showGMNotes)}>
      GM-Notizen {showGMNotes ? "verbergen" : "anzeigen"}
    </button>
    {showGMNotes && <p>{npc.gm_notes}</p>}
  </div>
)}

{/* Visibility Indicator - Nur für GM */}
{!npc.is_revealed && isGM && (
  <div>
    <EyeOff /> Nur für den GM sichtbar
  </div>
)}
```

**Player sieht nur:**
- ✅ Name
- ✅ Title/Role
- ✅ Description
- ✅ Faction Badge (bei NPCs)
- ✅ Type & Status Badges (bei Factions)
- ✅ Member Count (bei Factions)

**Player sieht NICHT:**
- ❌ GM Notes
- ❌ Edit/Delete Buttons
- ❌ Reveal Toggle
- ❌ "Nur für GM sichtbar" Indicator

---

## 📊 Data Flow mit RLS:

### **Complete Journey:**

```
1. Page lädt
   ├─ getNPCs(campaignId)
   │  └─ RLS Policy prüft: auth.uid() = GM?
   │     ├─ JA → Alle NPCs (revealed + hidden)
   │     └─ NEIN → Nur NPCs mit is_revealed=true
   └─ getFactionsWithMembers(campaignId)
      └─ RLS Policy prüft: auth.uid() = GM?
         ├─ JA → Alle Factions (revealed + hidden)
         └─ NEIN → Nur Factions mit is_revealed=true

2. Tabs rendern
   ├─ NPCs Tab → Sichtbar für alle User
   ├─ Fraktionen Tab → Sichtbar für alle User
   └─ Mitglieder Tab → Nur für GM

3. Cards rendern
   ├─ isGM = true → Volle Controls
   └─ isGM = false → Read-Only Mode
```

---

## 🔐 Security durch RLS:

### **Supabase RLS Policies:**

**NPCs Table:**
```sql
-- GM kann alles sehen
CREATE POLICY "npcs_select_by_gm"
  ON npcs FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Player können nur revealed NPCs sehen
CREATE POLICY "npcs_select_by_players"
  ON npcs FOR SELECT
  USING (
    is_revealed = TRUE
    AND campaign_id IN (
      SELECT campaign_id FROM campaign_members 
      WHERE user_id = auth.uid() 
      AND status = 'Accepted'
    )
  );
```

**Factions Table:**
```sql
-- Identisch für Factions
CREATE POLICY "factions_select_by_gm" ...
CREATE POLICY "factions_select_by_players" ...
```

**Wichtig:**
- ✅ **Keine Frontend-Filterung nötig** – RLS regelt alles im Backend
- ✅ **Sichere Architektur** – Player können nicht durch URL-Manipulation zugreifen
- ✅ **Performance** – Nur relevante Daten werden übertragen

---

## 🎨 UI/UX Features:

### **Empty States:**

#### **GM View:**
```
┌────────────────────────────────────────┐
│        👤                               │
│   Noch keine NPCs                      │
│   Erstelle deinen ersten NPC...        │
│   [ Ersten NPC erstellen ]             │
└────────────────────────────────────────┘
```

#### **Player View:**
```
┌────────────────────────────────────────┐
│        👤                               │
│   Keine NPCs verfügbar                 │
│   Der Spielleiter hat noch keine       │
│   NPCs für dich sichtbar gemacht.      │
└────────────────────────────────────────┘
```

---

### **NPC Card - Comparison:**

#### **GM View:**
```
┌─────────────────────────────────────────────┐
│ 👤 Raven              [👁️] [✏️] [🗑️]      │
│    SPION                                    │
│ ────────────────────────────────────────── │
│ 🛡️ Mitglied der Schattengilde             │
│ Ein mysteriöser Spion...                   │
│ ────────────────────────────────────────── │
│ [ ⚠️ GM-Notizen anzeigen ]                 │
│ ────────────────────────────────────────── │
│ 👁️‍🗨️ Nur für den GM sichtbar (wenn hidden) │
└─────────────────────────────────────────────┘
```

#### **Player View:**
```
┌─────────────────────────────────────────────┐
│ 👤 Raven                                    │
│    SPION                                    │
│ ────────────────────────────────────────── │
│ 🛡️ Mitglied der Schattengilde             │
│ Ein mysteriöser Spion...                   │
└─────────────────────────────────────────────┘
```

**Unterschiede:**
- ❌ Keine Action Buttons
- ❌ Keine GM Notes Section
- ❌ Kein Visibility Indicator
- ✅ Cleaner, fokussierter Look

---

## 🧪 Testing Checklist:

### **Test 1: Als GM**
- [ ] Navigiere zu Campaign → Tab "NPCs"
- [ ] **Expected:** "Neuer NPC" Button sichtbar
- [ ] **Expected:** Edit/Delete/Reveal Buttons auf Cards
- [ ] **Expected:** GM Notes Button sichtbar
- [ ] Erstelle einen NPC mit `is_revealed = false`
- [ ] **Expected:** "Nur für GM sichtbar" Badge erscheint

### **Test 2: Als Player (Revealed Content)**
- [ ] Logge als Player ein (Accepted Member)
- [ ] Navigiere zu Campaign → Tab "NPCs"
- [ ] **Expected:** Tabs "NPCs" und "Fraktionen" sind sichtbar
- [ ] **Expected:** "Neuer NPC" Button ist NICHT sichtbar
- [ ] **Expected:** Nur revealed NPCs werden angezeigt
- [ ] **Expected:** Keine Edit/Delete/Reveal Buttons
- [ ] **Expected:** Keine GM Notes Section

### **Test 3: Hidden Content Filtering**
- [ ] Als GM: Erstelle NPC mit `is_revealed = false`
- [ ] Als GM: NPC ist sichtbar mit Badge "Nur für GM sichtbar"
- [ ] Logge als Player ein
- [ ] **Expected:** Hidden NPC ist NICHT sichtbar
- [ ] Als GM: Toggle Reveal zu `true`
- [ ] Als Player: Seite refreshen
- [ ] **Expected:** NPC ist jetzt sichtbar

### **Test 4: Empty States**
- [ ] Als GM: Lösche alle NPCs
- [ ] **Expected:** "Noch keine NPCs" + Button "Ersten NPC erstellen"
- [ ] Als Player: Navigiere zu NPCs Tab
- [ ] **Expected:** "Keine NPCs verfügbar" + kein Button

---

## 🔧 Troubleshooting:

### **Problem: Player sehen KEINE NPCs (obwohl revealed)**

**Ursache:** RLS Policy fehlt oder User ist kein Accepted Member.

**Lösung:**
```sql
-- 1. Prüfe RLS Policy:
SELECT * FROM pg_policies 
WHERE tablename = 'npcs' 
AND policyname = 'npcs_select_by_players';

-- 2. Prüfe Membership:
SELECT * FROM campaign_members 
WHERE user_id = 'player-user-id' 
AND campaign_id = 'campaign-id' 
AND status = 'Accepted';

-- 3. Falls Policy fehlt, führe aus:
-- tableheroes/sql/create_factions_and_npcs_tables.sql
```

---

### **Problem: Player sehen GM Notes oder Edit Buttons**

**Ursache:** `isGM` Prop wird nicht korrekt übergeben.

**Debug:**
```typescript
// In NPCsManagement.tsx:
console.log("isGM in NPCsManagement:", isGM);

// Expected Output:
// GM: isGM in NPCsManagement: true
// Player: isGM in NPCsManagement: false
```

**Verify:**
```typescript
// In page.tsx:
const isGM = campaign.gm_id === user.id;
console.log("isGM:", isGM, "GM ID:", campaign.gm_id, "User ID:", user.id);
```

---

### **Problem: Player sehen hidden NPCs**

**Ursache:** RLS Policy greift nicht oder `is_revealed` ist nicht korrekt gesetzt.

**Test Query:**
```sql
-- Als Player authentifiziert:
SELECT * FROM npcs 
WHERE campaign_id = 'your-campaign-id';

-- Sollte NUR NPCs mit is_revealed=true zurückgeben
```

**Fix:**
```sql
-- Setze is_revealed korrekt:
UPDATE npcs 
SET is_revealed = true 
WHERE id = 'npc-id';
```

---

## 📝 Files Changed:

```
✅ tableheroes/src/app/dashboard/campaigns/[id]/page.tsx
   - Data Fetching für alle User aktiviert
   - NPCsTab & FactionsTab immer rendern
   - isGM Prop an Management-Komponenten übergeben

✅ tableheroes/src/app/dashboard/campaigns/[id]/CampaignTabs.tsx
   - NPCs & Fraktionen Tabs für alle User sichtbar
   - Mitglieder Tab nur für GM

✅ tableheroes/src/app/dashboard/campaigns/[id]/NPCsManagement.tsx
   - isGM Prop hinzugefügt
   - "Neuer NPC" Button nur für GM
   - Empty State abhängig von isGM
   - Modal nur für GM rendern

✅ tableheroes/src/app/dashboard/campaigns/[id]/FactionsManagement.tsx
   - isGM Prop hinzugefügt
   - "Neue Fraktion" Button nur für GM
   - Info-Box nur für GM
   - Empty State abhängig von isGM
   - Modal nur für GM rendern

✅ tableheroes/src/components/dashboard/NPCCard.tsx
   - Bereits vorbereitet mit isGM Logic
   - GM Actions nur für isGM=true
   - GM Notes nur für isGM=true

✅ tableheroes/src/components/dashboard/FactionCard.tsx
   - Bereits vorbereitet mit isGM Logic
   - GM Actions nur für isGM=true
   - GM Notes nur für isGM=true
```

---

## ✨ Key Features:

1. **Automatische RLS-Filterung:** Backend filtert basierend auf User-Rolle
2. **Read-Only Mode:** Player sehen NPCs/Factions ohne Edit-Rechte
3. **GM Notes Protection:** GM-Notizen sind für Player unsichtbar
4. **Graduelle Story-Enthüllung:** GM kann NPCs/Factions nach und nach revealen
5. **Clean Player UX:** Keine verwirrenden Buttons oder Actions
6. **Consistent Empty States:** Unterschiedliche Messages für GM vs Player
7. **Tab System:** Intuitive Navigation für beide User-Typen

---

## 🎯 User Flows:

### **GM Workflow:**
```
1. Erstelle NPCs/Factions (is_revealed = false)
2. Plane Story-Beats
3. Vor/Während Session: Toggle Reveal
4. Player sehen NPCs/Factions sofort
5. GM kann jederzeit wieder verbergen
```

### **Player Workflow:**
```
1. Navigiere zu Campaign Dashboard
2. Öffne Tab "NPCs" oder "Fraktionen"
3. Sehe nur revealed Content
4. Lese Beschreibungen & Faction-Infos
5. Keine Verwirrung durch GM-Tools
```

---

## 🎉 Implementation Complete!

**Die Player View für NPCs & Fraktionen ist vollständig implementiert und einsatzbereit!**

**Nächste Schritte:**
1. ✅ Teste als GM (Create, Edit, Reveal)
2. ✅ Teste als Player (Read-Only View)
3. ✅ Verify RLS Policies (siehe Troubleshooting)
4. ✅ Optional: Feedback sammeln & iterieren

**Die Spieler können jetzt die Welt entdecken, die der GM für sie vorbereitet hat – ohne Spoiler und ohne Verwirrung!** 🎭✨🎯





