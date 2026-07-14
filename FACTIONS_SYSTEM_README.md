# 🏰 Factions & NPCs System - Implementation Guide

Das **Factions & Relations System** wurde erfolgreich implementiert! Dieses Feature ermöglicht es GMs, NPCs und Fraktionen zu verwalten und Beziehungen zwischen ihnen zu visualisieren.

---

## ✅ Was wurde implementiert:

### **1. Server Actions**

#### **Factions Actions (`factions-actions.ts`):**
- ✅ `createFaction()` - Erstellt neue Fraktionen
- ✅ `updateFaction()` - Bearbeitet bestehende Fraktionen
- ✅ `deleteFaction()` - Löscht Fraktionen
- ✅ `toggleFactionReveal()` - Toggle Sichtbarkeit für Spieler
- ✅ `getFactionsWithMembers()` - Fetcht Fraktionen mit Member Count

#### **NPC Actions (`npc-actions.ts`):**
- ✅ `createNPC()` - Erstellt neue NPCs
- ✅ `updateNPC()` - Bearbeitet bestehende NPCs
- ✅ `deleteNPC()` - Löscht NPCs
- ✅ `toggleNPCReveal()` - Toggle Sichtbarkeit für Spieler
- ✅ `getNPCs()` - Fetcht NPCs **mit Faction Join**

---

### **2. UI Components**

#### **Faction Components:**
- ✅ **FactionCard.tsx**: Zeigt Fraktion mit Type, Status, Member Count, GM Actions
- ✅ **FactionCreationWizard.tsx**: Schritt-für-Schritt-Wizard zum Erstellen/Bearbeiten von Fraktionen
- ✅ **FactionsManagement.tsx**: Tab-Container mit Grid und Modal-Logik

#### **NPC Components:**
- ✅ **NPCCard.tsx**: Zeigt NPC mit Role, **Faction Badge**, GM Actions
- ✅ **CreateNPCModal.tsx**: Formular mit **Faction Dropdown**
- ✅ **NPCsManagement.tsx**: Tab-Container mit Grid und Modal-Logik

---

### **3. Campaign Dashboard Integration**

#### **CampaignTabs.tsx:**
- ✅ Neue Tabs: "NPCs" und "Fraktionen"
- ✅ Icons: `User` (NPCs), `Shield` (Fraktionen)
- ✅ Conditional Rendering (nur für GM sichtbar)

#### **Campaign Page (`page.tsx`):**
- ✅ Data Fetching für NPCs und Factions
- ✅ Tab-Content Creation für beide Tabs
- ✅ Props-Passing an CampaignTabs

---

### **4. Database Schema**

#### **SQL-Datei:** `sql/create_factions_and_npcs_tables.sql`

**Factions Table:**
```sql
- id (UUID)
- campaign_id (FK → campaigns)
- name (TEXT)
- type (TEXT) -- 'Gilde', 'Fraktion', 'Orden', 'Kult', etc.
- current_status (TEXT) -- 'Neutral', 'Verbündet', 'Feindlich', etc.
- description (TEXT)
- gm_notes (TEXT)
- is_revealed (BOOLEAN)
- created_at, updated_at
```

**NPCs Table:**
```sql
- id (UUID)
- campaign_id (FK → campaigns)
- name (TEXT)
- role (TEXT)
- description (TEXT)
- gm_notes (TEXT)
- faction_id (FK → factions, nullable) ← WICHTIG!
- is_revealed (BOOLEAN)
- created_at, updated_at
```

---

## 🚀 Setup Instructions

### **Step 1: Datenbank Setup**

1. Öffne Supabase Dashboard → SQL Editor
2. Führe die Datei `sql/create_factions_and_npcs_tables.sql` aus
3. Das Script erstellt:
   - ✅ Beide Tabellen
   - ✅ Indexes für Performance
   - ✅ RLS Policies (GM & Player Zugriff)
   - ✅ Triggers für `updated_at`

### **Step 2: App Starten**

```bash
npm run dev
```

### **Step 3: Testen**

1. Logge dich als **GM** ein
2. Navigiere zu einem Campaign Dashboard (`/dashboard/campaigns/[id]`)
3. Du siehst jetzt **5 Tabs:**
   - Übersicht
   - Sessions
   - **NPCs** ← NEU!
   - **Fraktionen** ← NEU!
   - Mitglieder

---

## 🎯 Features & Workflows

### **A. Fraktionen erstellen**

1. Klicke auf Tab **"Fraktionen"**
2. Klicke auf **"Neue Fraktion"**
3. Fülle das Formular aus:
   - **Name:** z.B. "Die Schattengilde"
   - **Typ:** Gilde, Fraktion, Orden, Kult, Königreich, Organisation, Andere
   - **Status:** Neutral, Verbündet, Freundlich, Feindlich, Im Krieg
   - **Beschreibung:** Spieler-sichtbare Info
   - **GM-Notizen:** Nur für dich sichtbar
   - **Sichtbarkeit:** Toggle für Spieler
4. Klicke **"Fraktion erstellen"**

**Faction Card Features:**
- ✅ Type Badge (farbcodiert nach Typ)
- ✅ Status Badge (farbcodiert nach Status)
- ✅ Member Count (automatisch berechnet)
- ✅ GM Actions: Edit, Delete, Toggle Reveal
- ✅ Collapsible GM Notes

---

### **B. NPCs erstellen & Fraktionen zuordnen**

1. Klicke auf Tab **"NPCs"**
2. Klicke auf **"Neuer NPC"**
3. Fülle das Formular aus:
   - **Name:** z.B. "Raven"
   - **Rolle:** z.B. "Spion"
   - **Zugehörigkeit:** Dropdown mit allen Fraktionen ← WICHTIG!
   - **Beschreibung:** Spieler-sichtbare Info
   - **GM-Notizen:** Nur für dich sichtbar
   - **Sichtbarkeit:** Toggle für Spieler
4. Klicke **"NPC erstellen"**

**NPC Card Features:**
- ✅ Role Display
- ✅ **Faction Badge:** "Mitglied der [Fraktionsname]" ← NEU!
- ✅ GM Actions: Edit, Delete, Toggle Reveal
- ✅ Collapsible GM Notes

---

### **C. Beziehungen visualisieren**

**Workflow-Beispiel:**

1. **Erstelle Fraktionen:**
   - "Die Schattengilde" (Gilde, Neutral)
   - "Der Orden der Silberhand" (Orden, Verbündet)
   - "Das Schwarze Netz" (Kult, Feindlich)

2. **Erstelle NPCs und ordne sie zu:**
   - "Raven" → Die Schattengilde (Spion)
   - "Paladin Alaric" → Der Orden der Silberhand (Krieger)
   - "Dunkler Priester" → Das Schwarze Netz (Kultist)

3. **Resultat:**
   - Auf der **Factions Card** siehst du: "3 Mitglieder" (Member Count)
   - Auf der **NPC Card** siehst du: "Mitglied der Schattengilde" (Badge)
   - Du kannst sofort sehen, welche NPCs zu welcher Fraktion gehören!

---

## 🎨 UI/UX Features

### **Faction Card - Farbcodierung:**

**Type Badges:**
- 🔵 **Gilde:** Blau
- 🟣 **Fraktion:** Lila
- 🟡 **Orden:** Gelb
- 🔴 **Kult:** Rot
- 🟢 **Königreich:** Grün
- ⚫ **Organisation:** Grau
- ⚪ **Andere:** Slate

**Status Badges:**
- 🔴 **Im Krieg:** Rot
- 🟢 **Verbündet:** Grün
- ⚫ **Neutral:** Grau
- 🟠 **Feindlich:** Orange
- 🔵 **Freundlich:** Blau

---

### **NPC Card - Faction Badge:**

```tsx
{npc.factions && (
  <div className="flex items-center gap-1.5">
    <Shield className="h-3 w-3 text-accent-gold/60" />
    <span>
      Mitglied der <span className="text-accent-gold">{npc.factions.name}</span>
    </span>
  </div>
)}
```

**Visual:**
```
┌─────────────────────────────────────┐
│ 👤  Raven                           │
│     SPION                           │
│ ───────────────────────────────────│
│ 🛡️  Mitglied der Schattengilde     │
└─────────────────────────────────────┘
```

---

## 🔐 Security & Permissions

### **RLS Policies:**

#### **GM Access:**
- ✅ Kann alle NPCs und Fraktionen in seinen Kampagnen sehen
- ✅ Kann NPCs und Fraktionen erstellen, bearbeiten, löschen
- ✅ Kann Sichtbarkeit für Spieler togglen

#### **Player Access:**
- ✅ Können nur **revealed** NPCs/Fraktionen sehen
- ✅ Nur in Kampagnen, in denen sie **Accepted** Member sind
- ❌ Können **nicht** bearbeiten oder erstellen
- ❌ Sehen **keine** GM-Notizen

---

## 📊 Data Flow

### **Complete Journey:**

```
1. GM erstellt Fraktion "Die Schattengilde"
   └─ factions Table: Insert new row

2. GM erstellt NPC "Raven"
   ├─ Wählt "Die Schattengilde" im Dropdown
   └─ npcs Table: Insert with faction_id = [Fraktion ID]

3. Campaign Page lädt
   ├─ getFactionsWithMembers() fetcht Fraktionen
   │  └─ Für jede Fraktion: Count NPCs (member_count)
   └─ getNPCs() fetcht NPCs
      └─ Join: factions(id, name, type)

4. UI rendert
   ├─ FactionsManagement: Grid mit FactionCards
   │  └─ Jede Card zeigt: Type, Status, Member Count
   └─ NPCsManagement: Grid mit NPCCards
      └─ Jede Card zeigt: Role, Faction Badge
```

---

## 🧪 Testing Checklist

### **Test 1: Fraktion erstellen**
- [ ] Als GM: Navigiere zu Campaign → Tab "Fraktionen"
- [ ] Klicke "Neue Fraktion"
- [ ] Fülle Formular aus (Name, Typ, Status)
- [ ] **Expected:** Faction Card erscheint im Grid
- [ ] **Expected:** Member Count = 0

### **Test 2: NPC mit Fraktion erstellen**
- [ ] Als GM: Navigiere zu Campaign → Tab "NPCs"
- [ ] Klicke "Neuer NPC"
- [ ] Wähle eine Fraktion im Dropdown
- [ ] **Expected:** NPC Card zeigt Faction Badge
- [ ] **Expected:** Faction Card zeigt Member Count = 1

### **Test 3: Faction Editing**
- [ ] Klicke Edit-Button auf Faction Card
- [ ] Ändere Status von "Neutral" zu "Im Krieg"
- [ ] **Expected:** Badge Color ändert sich zu Rot
- [ ] **Expected:** Änderungen sofort sichtbar

### **Test 4: Player View**
- [ ] Setze Fraktion auf `is_revealed = false`
- [ ] Logge dich als Player ein
- [ ] **Expected:** Fraktion ist NICHT sichtbar
- [ ] Setze Fraktion auf `is_revealed = true`
- [ ] **Expected:** Fraktion ist jetzt sichtbar

---

## 🐛 Troubleshooting

### **Problem: "Noch keine Fraktionen" obwohl sie existieren**

**Ursache:** RLS Policy blockiert Zugriff.

**Lösung:**
```sql
-- Prüfe, ob du als GM authentifiziert bist:
SELECT auth.uid(); -- Sollte deine User ID zeigen

-- Prüfe campaign_gm_id:
SELECT gm_id FROM campaigns WHERE id = 'your-campaign-id';
-- Sollte deine User ID sein!
```

---

### **Problem: "NPCs zeigen keine Faction Badge"**

**Ursache:** Faction-Join funktioniert nicht.

**Debug:**
```typescript
// In Browser Console:
const { data } = await supabase
  .from("npcs")
  .select(`*, factions(id, name, type)`)
  .eq("campaign_id", "your-campaign-id");
console.log(data);
```

**Expected:**
```javascript
[
  {
    id: "npc-123",
    name: "Raven",
    faction_id: "faction-456",
    factions: {  // ← Sollte vorhanden sein!
      id: "faction-456",
      name: "Die Schattengilde",
      type: "Gilde"
    }
  }
]
```

---

### **Problem: "Faction Dropdown ist leer im NPC Modal"**

**Ursache:** Factions wurden nicht korrekt gefetcht oder sind leer.

**Lösung:**
1. Prüfe, ob Fraktionen existieren (Tab "Fraktionen")
2. Erstelle zuerst eine Fraktion
3. Dann erstelle einen NPC

**Hinweis:** Das Modal zeigt eine Info-Nachricht, wenn keine Fraktionen vorhanden sind.

---

## 🎯 Next Steps & Erweiterungen

### **Mögliche Erweiterungen:**

1. **Relations Visualizer:**
   - Graphische Darstellung von Faction-Beziehungen
   - Drag & Drop Nodes für NPCs zwischen Factions

2. **Faction Conflicts:**
   - Tracking von Kriegen zwischen Factions
   - History Log für Status-Änderungen

3. **NPC Portraits:**
   - Avatar Upload für NPCs
   - Integration mit Faction Banner

4. **Faction Quests:**
   - Zuordnung von Quests zu Fraktionen
   - Reputation System

5. **Export/Import:**
   - Export Factions & NPCs als JSON
   - Import aus anderen Kampagnen

---

## 📝 Code Structure Summary

```
tableheroes/
├── src/
│   ├── app/
│   │   └── dashboard/
│   │       └── campaigns/
│   │           └── [id]/
│   │               ├── page.tsx               ← Main Integration
│   │               ├── CampaignTabs.tsx       ← Tab System
│   │               ├── factions-actions.ts    ← Faction CRUD
│   │               ├── npc-actions.ts         ← NPC CRUD
│   │               ├── FactionsManagement.tsx ← Faction Tab Container
│   │               └── NPCsManagement.tsx     ← NPC Tab Container
│   └── components/
│       └── dashboard/
│           ├── FactionCard.tsx         ← Faction Display
│           ├── FactionCreationWizard.tsx  ← Faction Wizard
│           ├── NPCCard.tsx             ← NPC Display (with Faction Badge!)
│           └── CreateNPCModal.tsx      ← NPC Form (with Faction Dropdown!)
└── sql/
    └── create_factions_and_npcs_tables.sql ← Database Setup
```

---

## ✨ Key Highlights

### **1. Faction Badge auf NPC Card:**
```tsx
{npc.factions && (
  <div className="flex items-center gap-1.5">
    <Shield className="h-3 w-3 text-accent-gold/60" />
    <span>Mitglied der <span className="text-accent-gold">{npc.factions.name}</span></span>
  </div>
)}
```

### **2. Member Count auf Faction Card:**
```tsx
<div className="flex items-center gap-1 text-gray-400">
  <Users className="h-3 w-3" />
  <span>{faction.member_count} {faction.member_count === 1 ? "Mitglied" : "Mitglieder"}</span>
</div>
```

### **3. Faction Dropdown im NPC Modal:**
```tsx
<select value={formData.faction_id} onChange={...}>
  <option value="">-- Keine Fraktion --</option>
  {factions.map((faction) => (
    <option key={faction.id} value={faction.id}>
      {faction.name}
    </option>
  ))}
</select>
```

---

## 🎉 Implementation Complete!

**Das Factions & NPCs System ist vollständig implementiert und einsatzbereit!**

**Nächste Schritte:**
1. ✅ Führe das SQL-Script aus
2. ✅ Starte die App
3. ✅ Teste die Features als GM
4. ✅ Optional: Teste als Player (Reveal-Feature)

**Viel Erfolg beim Erstellen deiner Fraktionen und NPCs!** 🏰⚔️✨





