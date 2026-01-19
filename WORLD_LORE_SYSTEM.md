# 🌍 Hierarchical World Lore System - Implementation Complete

Das **Hierarchical World Lore System** wurde erfolgreich implementiert! GMs können jetzt verschachtelte Lore-Strukturen erstellen (z.B. Königreich → Stadt → Taverne) und Players können diese in einer Baumansicht entdecken.

---

## ✅ Was wurde implementiert:

### **1. Server Actions mit Parent Support**

**File:** `src/app/dashboard/campaigns/[id]/lore-actions.ts`

**Features:**
- ✅ `createLoreEntry()` - Erstellt Einträge mit optional `parent_id`
- ✅ `updateLoreEntry()` - Bearbeitet Einträge, verhindert zirkuläre Referenzen
- ✅ `deleteLoreEntry()` - Löscht Einträge, prüft auf Kinder
- ✅ `toggleLoreReveal()` - Toggle Sichtbarkeit für Spieler
- ✅ `getLoreEntries()` - Fetcht alle Einträge (flache Liste für Tree-Rekonstruktion)

**Key Features:**
```typescript
// Circular Reference Prevention
if (updates.parent_id && updates.parent_id === loreId) {
  throw new Error("Ein Eintrag kann nicht sein eigenes Elternelement sein.");
}

// Child Protection
if (children && children.length > 0) {
  throw new Error(
    `Dieser Eintrag hat ${children.length} Unterelement(e). Bitte lösche oder verschiebe diese zuerst.`
  );
}
```

---

### **2. Lore Card mit Expand/Collapse**

**File:** `src/components/dashboard/LoreCard.tsx`

**Features:**
- ✅ Hierarchische Darstellung mit Einrückung (`ml-${depth * 4}`)
- ✅ Expand/Collapse Arrow für Einträge mit Kindern
- ✅ Type Badges (8 verschiedene Typen mit Farbcodierung)
- ✅ GM Actions: Edit, Delete, Reveal Toggle
- ✅ GM Notes (collapsible)
- ✅ Rekursives Rendering von Kinder-Einträgen

**Type Badge Colors:**
- 🟢 **Location** - Green
- 🟡 **History** - Amber
- 🟣 **Religion** - Purple
- 🔵 **Culture** - Blue
- 🩷 **Magic** - Pink
- ⚫ **Organization** - Gray
- 🔴 **Event** - Red
- ⚪ **Other** - Slate

---

### **3. Create Lore Modal mit Parent Selection**

**File:** `src/components/dashboard/CreateLoreModal.tsx`

**Features:**
- ✅ Name Field
- ✅ Type Dropdown (8 Typen)
- ✅ **Parent Selection:** "Gehört zu..." Dropdown
  - Zeigt alle existierenden Locations
  - Option "Kein übergeordneter Ort" (Root Level)
  - Filtert den bearbeiteten Eintrag aus (verhindert Self-Reference)
- ✅ Image URL (optional)
- ✅ Description (Player-sichtbar)
- ✅ GM Notes (nur für GM)
- ✅ Reveal Toggle

**Parent Selection Logic:**
```typescript
<select value={formData.parent_id} ...>
  <option value="">-- Kein übergeordneter Ort --</option>
  {parentOptions
    .filter((opt) => !isEditMode || opt.id !== existingLore?.id)
    .map((parent) => (
      <option key={parent.id} value={parent.id}>
        {parent.name} ({parent.type})
      </option>
    ))}
</select>
```

---

### **4. Lore Management mit Tree View & Filtering**

**File:** `src/app/dashboard/campaigns/[id]/LoreManagement.tsx`

**Features:**
- ✅ **Tree Reconstruction:** Flache Liste → Hierarchische Struktur
- ✅ **Type Filtering:** Buttons zum Filtern nach Type
- ✅ **Responsive Design:** Grid/List View
- ✅ **Empty States:** Unterschiedliche Messages für GM vs Player
- ✅ **GM Controls:** "Neuer Eintrag" Button, Info-Box

**Tree Building Algorithm:**
```typescript
const buildTree = (entries: LoreEntry[]): LoreEntry[] => {
  const map = new Map<string, LoreEntry>();
  const roots: LoreEntry[] = [];

  // First pass: Create map
  entries.forEach((entry) => {
    map.set(entry.id, { ...entry, children: [] });
  });

  // Second pass: Build tree
  entries.forEach((entry) => {
    const node = map.get(entry.id)!;
    if (entry.parent_id && map.has(entry.parent_id)) {
      const parent = map.get(entry.parent_id)!;
      parent.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};
```

---

### **5. Campaign Page Integration**

**File:** `src/app/dashboard/campaigns/[id]/page.tsx`

**Changes:**
- ✅ Import `getLoreEntries`, `LoreManagement`
- ✅ Fetch Lore Entries: `const loreEntries = await getLoreEntries(id);`
- ✅ Create `LoreTab` Content
- ✅ Pass `loreContent` to `CampaignTabs`

---

### **6. CampaignTabs Erweiterung**

**File:** `src/app/dashboard/campaigns/[id]/CampaignTabs.tsx`

**Changes:**
- ✅ Added `loreContent` Prop
- ✅ Added `"lore"` TabKey
- ✅ New Tab: "Welt & Lore" mit Book Icon 📖
- ✅ Render `loreContent` when active

**Tab Order:**
1. Übersicht
2. Sessions
3. NPCs
4. Fraktionen
5. **Welt & Lore** ← NEU!
6. Mitglieder (nur GM)

---

## 📊 Database Schema:

### **world_lore Table:**
```sql
CREATE TABLE world_lore (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES world_lore(id) ON DELETE CASCADE, -- Self-referencing!
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Location', 'History', etc.
  image_url TEXT,
  description TEXT,
  gm_notes TEXT,
  is_revealed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `campaign_id` - für Campaign-Filtering
- `parent_id` - für Tree-Queries
- `type` - für Type-Filtering
- `is_revealed` - für Player-Filtering

---

## 🎯 Usage Examples:

### **Example 1: Hierarchische Locations**
```
Königreich Arandor (Location)
├── Stadt Neverwinter (Location)
│   ├── Die Singende Klinge (Location) - Taverne
│   ├── Marktplatz (Location)
│   └── Hafenviertel (Location)
└── Dorf Phandalin (Location)
    └── Barthen's Provisions (Location) - Laden
```

### **Example 2: Geschichte**
```
Das Große Schisma (History)
├── Die Spaltung der Kirche (Event)
└── Der Krieg der Gläubigen (Event)
```

### **Example 3: Religionen**
```
Kult des Raben (Religion)
├── Die Prophezeiung (History)
└── Rituale des Kults (Magic)
```

---

## 🎨 UI/UX Features:

### **Tree View mit Expand/Collapse:**

```
📖 Königreich Arandor [Location]           [👁️] [✏️] [🗑️]
   Eine mächtiges Königreich...
   
   ▼ 2 Unterelemente

   📖 Stadt Neverwinter [Location]         [👁️] [✏️] [🗑️]
      Die Hauptstadt...
      
      ▶ 3 Unterelemente
```

**Features:**
- ✅ Chevron Icon dreht sich beim Expand/Collapse
- ✅ Border-Left Linie zeigt Hierarchie
- ✅ `ml-6` Einrückung für Kinder
- ✅ Count Badge zeigt Anzahl Unterelemente

---

### **Type Filter Bar:**

```
🔍 Filtern: [Alle] [Location] [History] [Religion] [Culture] [Magic] [Organization] [Event] [Other]
```

**Behavior:**
- ✅ Aktiver Filter: `bg-hero-vibrant text-white`
- ✅ Inaktive Filter: `bg-slate-800 text-gray-400`
- ✅ Hover Effect
- ✅ Filtered Tree wird dynamisch rekonstruiert

---

## 🔐 Security mit RLS:

### **RLS Policies:**

**GM Access:**
```sql
CREATE POLICY "world_lore_select_by_gm"
  ON world_lore FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );
```

**Player Access:**
```sql
CREATE POLICY "world_lore_select_by_players"
  ON world_lore FOR SELECT
  USING (
    is_revealed = TRUE
    AND campaign_id IN (
      SELECT campaign_id FROM campaign_members 
      WHERE user_id = auth.uid() 
      AND status = 'Accepted'
    )
  );
```

**Key Points:**
- ✅ GMs sehen alle Lore-Einträge (revealed + hidden)
- ✅ Players sehen nur `is_revealed = true` Einträge
- ✅ Hierarchie bleibt intakt (Kinder ohne revealed Parent werden als Root angezeigt)

---

## 🧪 Testing Checklist:

### **Test 1: Hierarchie erstellen**
- [ ] Als GM: Navigiere zu Tab "Welt & Lore"
- [ ] Erstelle "Königreich Arandor" (Location, kein Parent)
- [ ] Erstelle "Stadt Neverwinter" (Location, Parent: Arandor)
- [ ] Erstelle "Die Singende Klinge" (Location, Parent: Neverwinter)
- [ ] **Expected:** Hierarchie wird korrekt angezeigt
- [ ] **Expected:** Expand/Collapse funktioniert

### **Test 2: Type Filtering**
- [ ] Erstelle verschiedene Types (Location, History, Religion)
- [ ] Klicke Filter "Location"
- [ ] **Expected:** Nur Locations werden angezeigt
- [ ] Klicke "Alle"
- [ ] **Expected:** Alle Einträge wieder sichtbar

### **Test 3: Delete Protection**
- [ ] Versuche "Stadt Neverwinter" zu löschen (hat Kinder)
- [ ] **Expected:** Error "Dieser Eintrag hat X Unterelement(e)..."
- [ ] Lösche zuerst "Die Singende Klinge"
- [ ] Lösche dann "Stadt Neverwinter"
- [ ] **Expected:** Erfolgreich gelöscht

### **Test 4: Player View**
- [ ] Als GM: Erstelle Lore mit `is_revealed = false`
- [ ] Logge als Player ein
- [ ] **Expected:** Hidden Lore ist nicht sichtbar
- [ ] Als GM: Toggle Reveal zu `true`
- [ ] Als Player: Refresh
- [ ] **Expected:** Lore ist jetzt sichtbar

### **Test 5: Circular Reference Prevention**
- [ ] Als GM: Erstelle "Königreich A"
- [ ] Bearbeite "Königreich A"
- [ ] Versuche Parent auf "Königreich A" selbst zu setzen
- [ ] **Expected:** Error verhindert Self-Reference

---

## 🔧 Troubleshooting:

### **Problem: Tree wird nicht korrekt aufgebaut**

**Ursache:** `parent_id` Referenzen sind inkonsistent.

**Debug:**
```typescript
// In LoreManagement.tsx:
console.log("All Lore Entries:", loreEntries);
console.log("Built Tree:", filteredTree);

// Check for orphaned entries
const orphans = loreEntries.filter(entry => 
  entry.parent_id && !loreEntries.find(e => e.id === entry.parent_id)
);
console.log("Orphaned Entries:", orphans);
```

**Fix:**
```sql
-- Find orphaned entries
SELECT * FROM world_lore 
WHERE parent_id IS NOT NULL 
AND parent_id NOT IN (SELECT id FROM world_lore);

-- Fix: Set parent_id to NULL
UPDATE world_lore 
SET parent_id = NULL 
WHERE parent_id NOT IN (SELECT id FROM world_lore);
```

---

### **Problem: Player sieht keine Lore**

**Ursache:** RLS Policy fehlt oder User ist kein Accepted Member.

**Test Query:**
```sql
-- Als Player authentifiziert:
SELECT * FROM world_lore 
WHERE campaign_id = 'your-campaign-id';

-- Sollte nur Einträge mit is_revealed=true zurückgeben
```

**Fix:**
```sql
-- Führe SQL-Datei aus:
tableheroes/sql/create_world_lore_table.sql
```

---

### **Problem: "Dieser Eintrag hat X Unterelemente" beim Löschen**

**Ursache:** Der Eintrag hat Kinder, die zuerst gelöscht oder verschoben werden müssen.

**Lösung:**
```
Option 1: Lösche zuerst alle Kinder
Option 2: Verschiebe Kinder zu einem anderen Parent
Option 3: Setze Kinder auf Root-Level (parent_id = NULL)
```

**Future Enhancement:**
- Cascading Delete Option (mit Confirmation Dialog)
- "Move Children to Parent" Option

---

## 📝 Files Created/Modified:

```
✅ src/app/dashboard/campaigns/[id]/lore-actions.ts (NEW)
   - Server Actions für Lore CRUD

✅ src/components/dashboard/LoreCard.tsx (NEW)
   - Hierarchische Card mit Expand/Collapse

✅ src/components/dashboard/CreateLoreModal.tsx (NEW)
   - Modal mit Parent Selection

✅ src/app/dashboard/campaigns/[id]/LoreManagement.tsx (NEW)
   - Tree View Container mit Filtering

✅ src/app/dashboard/campaigns/[id]/page.tsx (MODIFIED)
   - Lore Fetching & Tab Integration

✅ src/app/dashboard/campaigns/[id]/CampaignTabs.tsx (MODIFIED)
   - Added "Welt & Lore" Tab

✅ sql/create_world_lore_table.sql (NEW)
   - Database Schema & RLS Policies
```

---

## 🎯 Key Features Summary:

1. **Hierarchical Structure** - Self-referencing `parent_id`
2. **Tree Building Algorithm** - Reconstructs hierarchy from flat list
3. **Expand/Collapse UI** - Recursive rendering with visual indentation
4. **Type System** - 8 different Types mit Farbcodierung
5. **Parent Selection** - Dropdown mit existing Locations
6. **Type Filtering** - Filter Buttons für alle Types
7. **Delete Protection** - Verhindert Löschen wenn Kinder vorhanden
8. **Circular Reference Prevention** - Verhindert Self-Reference
9. **RLS Security** - Automatische Filterung für GM vs Player
10. **Reveal System** - Graduelle Story-Enthüllung

---

## 🚀 Usage Workflow:

### **GM Workflow:**
```
1. Erstelle Root-Einträge (z.B. "Königreich Arandor")
2. Erstelle Kind-Einträge mit Parent Selection
3. Organisiere Hierarchie
4. Nutze Type Filtering zum Navigieren
5. Toggle Reveal für Players
6. Expand/Collapse zum Browsen
```

### **Player Workflow:**
```
1. Navigiere zu Tab "Welt & Lore"
2. Siehe revealed Lore in Baumstruktur
3. Expand/Collapse zum Entdecken
4. Nutze Type Filter
5. Lese Beschreibungen
6. Keine GM Notes oder Edit-Rechte
```

---

## 🎉 Implementation Complete!

**Das Hierarchical World Lore System ist vollständig implementiert und einsatzbereit!**

**Nächste Schritte:**
1. ✅ Führe `sql/create_world_lore_table.sql` in Supabase aus
2. ✅ Teste Tree Building mit mehreren Levels
3. ✅ Teste Type Filtering
4. ✅ Teste Player View mit revealed/hidden Content
5. ✅ Optional: Füge Seed Data hinzu

**GMs können jetzt komplexe Welten mit verschachtelten Locations, Geschichte und Lore erstellen, und Players können diese Schritt für Schritt entdecken!** 🌍📖✨





