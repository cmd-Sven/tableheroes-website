# TableHeroes - Projektstruktur

## 📁 Hauptverzeichnisse

```
THeroesWebsite/
├── tableheroes/                    # Hauptprojekt-Ordner
│   ├── src/                        # Quellcode
│   ├── public/                     # Statische Assets
│   ├── migrations/                 # Datenbank-Migrationen
│   ├── sql/                        # SQL-Skripte
│   └── [Konfigurationsdateien]
└── dummy                           # Temporäre Dateien (nicht Teil der App)
```

---

## 📂 Detaillierte Struktur

### **Root-Verzeichnis (`tableheroes/`)**

#### Konfigurationsdateien
- `package.json` - NPM-Abhängigkeiten & Scripts
- `package-lock.json` - Dependency-Lock
- `tsconfig.json` - TypeScript-Konfiguration
- `next.config.ts` - Next.js-Konfiguration
- `tailwind.config.ts` - Tailwind CSS-Konfiguration
- `postcss.config.mjs` - PostCSS-Konfiguration
- `eslint.config.mjs` - ESLint-Konfiguration
- `middleware.ts` - Next.js Middleware (Auth-Routing)
- `next-env.d.ts` - Next.js TypeScript-Definitionen

#### Dokumentation
- `README.md` - Projekt-README
- `FACTIONS_SYSTEM_README.md` - Fraktions-System Dokumentation
- `PLAYER_VIEW_UPDATE.md` - Player-View Update Dokumentation
- `WORLD_LORE_SYSTEM.md` - World-Lore-System Dokumentation

---

### **📁 `src/` - Quellcode**

#### **`src/app/` - Next.js App Router (Pages & Routes)**

```
app/
├── (auth)/                         # Route Group: Authentifizierung
│   ├── layout.tsx                  # Auth-Layout
│   ├── actions.ts                  # Auth-Server-Actions
│   ├── signout-action.ts           # Sign-Out Action
│   ├── login/
│   │   └── page.tsx               # Login-Seite
│   └── signup/
│       └── page.tsx                # Registrierungs-Seite
│
├── (marketing)/                    # Route Group: Marketing/Public
│   ├── layout.tsx                  # Marketing-Layout
│   ├── page.tsx                    # Landing Page
│   ├── campaigns/
│   │   └── [id]/
│   │       ├── page.tsx            # Kampagnen-Detail (Public)
│   │       ├── ApplicationModal.tsx
│   │       └── ApplyButton.tsx
│   ├── datenschutz/
│   │   └── page.tsx                # Datenschutz
│   └── impressum/
│       └── page.tsx                # Impressum
│
├── (dashboard)/                    # Route Group: Dashboard (veraltet?)
│   └── campaigns/
│       └── new/
│
├── dashboard/                      # Haupt-Dashboard-Bereich
│   ├── layout.tsx                  # Dashboard-Layout
│   ├── page.tsx                    # Dashboard-Übersicht
│   ├── AcceptanceNotification.tsx
│   ├── CharacterCreationModal.tsx
│   ├── CharacterManager.tsx
│   ├── characters/
│   │   ├── actions.ts              # Character-Server-Actions
│   │   └── page.tsx                # Character-Übersicht
│   └── campaigns/
│       ├── new/
│       │   ├── actions.ts          # Kampagnen-Erstellung
│       │   └── page.tsx
│       └── [id]/                   # Kampagnen-Detail
│           ├── page.tsx            # Haupt-Kampagnen-Seite
│           ├── CampaignTabs.tsx    # Tab-Navigation
│           │
│           ├── actions.ts          # Allgemeine Campaign-Actions
│           ├── ai-actions.ts      # KI-Generierung (NPCs, Lore, etc.)
│           ├── application-actions.ts
│           ├── character-actions.ts
│           ├── character-review-actions.ts
│           ├── CharacterCreatorButton.tsx
│           ├── factions-actions.ts
│           ├── gallery-actions.ts
│           ├── location-actions.ts
│           ├── lore-actions.ts
│           ├── npc-actions.ts
│           ├── npc-relations-actions.ts
│           ├── npc-suggestions-actions.ts
│           ├── quest-actions.ts
│           ├── scene-actions.ts
│           ├── secrets-actions.ts
│           ├── session-actions.ts
│           ├── world-actions.ts
│           ├── world-skeleton-actions.ts
│           │
│           ├── IntegrationReportModal.tsx
│           ├── FactionsManagement.tsx
│           ├── LoreManagement.tsx
│           ├── MembersManagement.tsx
│           ├── NPCsManagement.tsx
│           ├── QuestLogManagement.tsx
│           ├── SessionsTab.tsx
│           │
│           ├── factions/
│           │   └── [factionId]/
│           │       ├── page.tsx    # Fraktions-Detail
│           │       └── edit/
│           │           └── page.tsx
│           │
│           ├── lore/
│           │   ├── new/
│           │   │   └── page.tsx   # Lore-Erstellung
│           │   └── [loreId]/
│           │       ├── page.tsx   # Lore-Detail
│           │       ├── loading.tsx
│           │       └── edit/
│           │           └── page.tsx
│           │
│           ├── locations/
│           │   └── [locationId]/
│           │       └── page.tsx    # Location-Detail
│           │
│           ├── npcs/
│           │   ├── new/
│           │   │   └── page.tsx   # NPC-Erstellung
│           │   └── [npcId]/
│           │       ├── page.tsx   # NPC-Detail
│           │       └── edit/
│           │           └── page.tsx
│           │
│           └── quests/
│               ├── new/
│               │   └── page.tsx   # Quest-Erstellung
│               └── [questId]/
│                   ├── page.tsx   # Quest-Detail
│                   └── edit/
│                       └── page.tsx
│
├── api/                            # API Routes
│   └── sidebar/
│       └── route.ts               # Sidebar-API
│
├── session/                        # Live-Session-Bereich
│   └── [sessionId]/
│       ├── page.tsx               # Session-Detail
│       └── LiveSessionBoard.tsx  # Live-Session-Board
│
├── layout.tsx                      # Root-Layout
├── globals.css                     # Globale Styles
└── favicon.ico                     # Favicon
```

---

#### **`src/components/` - React-Komponenten**

```
components/
├── dashboard/                      # Dashboard-Komponenten
│   ├── Sidebar.tsx                # Haupt-Sidebar
│   ├── SidebarWidthProvider.tsx   # Sidebar-Breiten-Provider
│   ├── CampaignCard.tsx           # Kampagnen-Karte
│   │
│   ├── campaigns/                 # Kampagnen-spezifische Komponenten
│   │   ├── CampaignHeaderGallery.tsx
│   │   ├── CinematicCampaignHeader.tsx
│   │   ├── CharacterSheet.tsx
│   │   ├── GMCharacterEditor.tsx
│   │   │
│   │   ├── FactionDetailPage.tsx  # Fraktions-Detailseite
│   │   ├── NPCDetailPage.tsx      # NPC-Detailseite
│   │   │
│   │   ├── factions/
│   │   │   └── FactionCreationWizard.tsx    # Fraktions-Wizard (Erstellen/Bearbeiten)
│   │   │
│   │   ├── lore/                  # Lore-Komponenten
│   │   │   ├── LoreDetailPage.tsx
│   │   │   ├── LoreForm.tsx
│   │   │   ├── LoreHeader.tsx
│   │   │   ├── LoreDescription.tsx
│   │   │   ├── LoreGallery.tsx
│   │   │   ├── LoreGMNotes.tsx
│   │   │   ├── LoreHierarchyManager.tsx
│   │   │   ├── LoreImageSlider.tsx
│   │   │   ├── GothicSpotlightDescription.tsx
│   │   │   ├── GraphicButton.tsx
│   │   │   └── ImageBorderContainer.tsx
│   │   │
│   │   ├── npcs/                  # NPC-Komponenten
│   │   │   ├── NPCForm.tsx        # NPC-Formular
│   │   │   ├── AIGenerationWizard.tsx
│   │   │   ├── AIGenerationWizardEmbedded.tsx
│   │   │   ├── WizardContent.tsx
│   │   │   ├── WizardInputs.tsx
│   │   │   ├── NPCHookWizard.tsx
│   │   │   ├── NPCRelationsList.tsx
│   │   │   ├── NPCCarousel.tsx
│   │   │   ├── CheckResultsEditor.tsx
│   │   │   ├── SmartLocationCombobox.tsx
│   │   │   └── SmartFactionCombobox.tsx
│   │   │
│   │   ├── quests/
│   │   │   ├── QuestDetailPage.tsx
│   │   │   └── QuestForm.tsx
│   │   │
│   │   ├── secrets/
│   │   │   └── SecretsManager.tsx
│   │   │
│   │   └── world/                 # World-Management
│   │       ├── WorldSetupForm.tsx
│   │       ├── WorldRequiredBlocker.tsx
│   │       ├── WorldContextSidebar.tsx
│   │       └── CampaignDeletedRedirect.tsx
│   │
│   ├── [Modal-Komponenten]
│   │   ├── CreateNPCModal.tsx
│   │   ├── FactionCreationWizard.tsx
│   │   ├── CreateLoreModal.tsx
│   │   ├── CreateQuestModal.tsx
│   │   ├── AddPersonModal.tsx
│   │   ├── SessionWizardModal.tsx
│   │   │
│   │   ├── NPCDetailModal.tsx
│   │   ├── FactionDetailModal.tsx
│   │   ├── LoreDetailModal.tsx
│   │   ├── QuestDetailModal.tsx
│   │   │
│   │   └── CharacterCreationModal.tsx
│   │
│   ├── [Card-Komponenten]
│   │   ├── NPCCard.tsx
│   │   ├── NPCGridCard.tsx
│   │   ├── FactionCard.tsx
│   │   ├── FactionGridCard.tsx
│   │   ├── LoreCard.tsx
│   │   ├── LoreGridCard.tsx
│   │   └── QuestCard.tsx
│   │
│   ├── [Character-Komponenten]
│   │   ├── CharacterCreator.tsx
│   │   ├── CharacterManager.tsx
│   │   ├── CharacterApplicationForm.tsx
│   │   ├── CharacterChangesView.tsx
│   │   ├── GMCharacterReview.tsx
│   │   └── ApplicationReviewView.tsx
│   │
│   ├── AutocompleteCombobox.tsx
│   └── [weitere Utility-Komponenten]
│
├── marketing/                      # Marketing-Komponenten
│   ├── MarketingLayout.tsx
│   ├── HeroSection.tsx
│   ├── ActiveCampaignsSection.tsx
│   ├── CampaignListAnimation.tsx
│   ├── CommunitySection.tsx
│   ├── FaqSection.tsx
│   ├── FeatureGamification.tsx
│   ├── FeaturePlayerHub.tsx
│   ├── FeatureTabsSection.tsx
│   ├── FeatureWorldBuilding.tsx
│   └── SystemsSection.tsx
│
├── layout/
│   └── Footer.tsx                 # Footer-Komponente
│
└── ui/                            # UI-Primitive
    └── skeleton.tsx               # Loading-Skeleton
```

---

#### **`src/lib/` - Bibliotheken & Utilities**

```
lib/
├── supabase/
│   ├── server.ts                  # Supabase Server-Client
│   └── [weitere Supabase-Utilities]
├── supabaseClient.ts              # Supabase Client-Client
├── database.types.ts              # Datenbank-Typen (generiert)
├── faction-types.ts               # Fraktions-Typen & Konstanten
├── lore-types.ts                  # Lore-Typen & Konstanten
└── utils.ts                       # Utility-Funktionen
```

---

#### **`src/types/` - TypeScript-Typen**

```
types/
└── npc.ts                         # NPC-Typen & Interfaces
```

---

### **📁 `public/` - Statische Assets**

```
public/
├── images/                        # Bilder & Grafiken
│   ├── border_left-right_gold.png
│   ├── border_top-bottom_gold.png
│   ├── button-green-wood.png
│   ├── button-green-wood_hover.png
│   ├── corner_dragon.jpg
│   ├── corner_claw.jpg
│   ├── corner_demon.jpg
│   ├── corner_hawk.jpg
│   ├── dark-marmor.jpg
│   ├── dark-wood.jpg
│   ├── grunge-paper-background.jpg
│   └── NPC-Icon-Image.png
│
├── file.svg
├── globe.svg
├── next.svg
├── vercel.svg
└── window.svg
```

---

### **📁 `migrations/` - Datenbank-Migrationen**

```
migrations/
├── add_npc_features.sql          # NPC-Features hinzufügen
├── add_skill_check_to_secrets.sql # Skill-Check zu Secrets
└── fix_quests_rls_for_players.sql # Quest-RLS für Spieler
```

---

### **📁 `sql/` - SQL-Skripte**

```
sql/
├── add_character_details_columns.sql
├── create_factions_and_npcs_tables.sql
├── create_quests_table.sql
├── create_world_lore_table.sql
└── fix_campaign_members_rls.sql
```

---

## 🏗️ Architektur-Übersicht

### **Route Groups (Next.js App Router)**
- `(auth)` - Authentifizierung (Login, Signup)
- `(marketing)` - Öffentliche Marketing-Seiten
- `(dashboard)` - Dashboard-Bereich (veraltet?)

### **Haupt-Routen**
- `/` - Landing Page (Marketing)
- `/dashboard` - Dashboard-Übersicht
- `/dashboard/campaigns/[id]` - Kampagnen-Detail
- `/dashboard/campaigns/[id]/npcs/[npcId]` - NPC-Detail
- `/dashboard/campaigns/[id]/lore/[loreId]` - Lore-Detail
- `/dashboard/campaigns/[id]/factions/[factionId]` - Fraktions-Detail
- `/dashboard/campaigns/[id]/quests/[questId]` - Quest-Detail
- `/session/[sessionId]` - Live-Session-Board

### **Server Actions (Pattern)**
Alle Server-Actions befinden sich in `app/dashboard/campaigns/[id]/`:
- `*-actions.ts` - Server-Actions für verschiedene Entitäten
- Pattern: `[entity]-actions.ts` (z.B. `npc-actions.ts`, `lore-actions.ts`)

### **Komponenten-Organisation**
- Feature-basiert: `components/dashboard/campaigns/[feature]/`
- Wiederverwendbar: `components/dashboard/[component].tsx`
- UI-Primitive: `components/ui/`

---

## 📊 Wichtige Dateien im Überblick

### **Server-Actions (Backend-Logik)**
- `npc-actions.ts` - NPC CRUD & Favoriten
- `lore-actions.ts` - Lore CRUD & Hierarchie
- `factions-actions.ts` - Fraktions CRUD
- `quest-actions.ts` - Quest CRUD
- `secrets-actions.ts` - Secrets-Management
- `ai-actions.ts` - KI-Generierung (OpenAI)
- `world-actions.ts` - World-Management
- `location-actions.ts` - Location-Management
- `npc-relations-actions.ts` - NPC-Beziehungen
- `session-actions.ts` - Session-Management

### **Haupt-Komponenten**
- `NPCDetailPage.tsx` - NPC-Detailseite (komplex, ~1800 Zeilen)
- `FactionDetailPage.tsx` - Fraktions-Detailseite
- `LoreDetailPage.tsx` - Lore-Detailseite (Orchestrator)
- `AIGenerationWizard.tsx` - KI-NPC-Generierungs-Wizard
- `SecretsManager.tsx` - Secrets-Verwaltung
- `Sidebar.tsx` - Haupt-Navigation

### **Formulare**
- `NPCForm.tsx` - NPC-Erstellung/Bearbeitung
- `LoreForm.tsx` - Lore-Erstellung/Bearbeitung
- `FactionCreationWizard.tsx` - Fraktions-Erstellung/Bearbeitung (Schritt-für-Schritt)
- `QuestForm.tsx` - Quest-Erstellung/Bearbeitung
- `WorldSetupForm.tsx` - World-Setup

---

## 🎨 Design-System

### **Styling**
- **Framework:** Tailwind CSS
- **Konfiguration:** `tailwind.config.ts`
- **Globale Styles:** `app/globals.css`

### **Hintergrundbilder** (`public/images/`)
- `dark-wood.jpg` - Dunkles Holz
- `dark-marmor.jpg` - Dunkler Marmor
- `grunge-paper-background.jpg` - Pergament-Hintergrund
- `old-paper.jpg` - Alt-Papier (vermutlich)
- Border-Images: `border_*.png`, `corner_*.jpg`

### **Schriftarten** (Tailwind Config)
- `font-barlow` - Barlow Condensed (Headings)
- `font-cinzel` - Cinzel (Fantasy-Akzente)
- `font-libre` - Libre Baskerville (Body)

---

## 🔧 Technologie-Stack

- **Framework:** Next.js 14 (App Router)
- **Sprache:** TypeScript
- **Styling:** Tailwind CSS
- **Datenbank:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **KI:** OpenAI API
- **Icons:** Lucide React
- **Animation:** Framer Motion
- **Markdown:** react-markdown

---

## 📝 Hinweise

- **Route Groups** `(auth)`, `(marketing)`, `(dashboard)` werden nicht in der URL angezeigt
- **Dynamische Routen** verwenden `[id]`, `[npcId]`, etc.
- **Server Actions** sind in separaten `.ts`-Dateien organisiert
- **Komponenten** sind feature-basiert gruppiert
- **Temporäre Dateien** wie `dummy` sind nicht Teil der App-Logik

