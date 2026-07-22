"use client";

/**
 * Schwere Session-UI hinter next/dynamic — eigener Chunk, erst bei Render geladen.
 * Three.js sitzt bereits hinter dynamic in DiceRollOverlay/DiceRollCanvas.
 */
import dynamic from "next/dynamic";

const modalLoading = () => null;

export const PrivateInventoryModal = dynamic(
  () =>
    import("@/src/components/inventory/PrivateInventoryModal").then((m) => ({
      default: m.PrivateInventoryModal,
    })),
  { ssr: false, loading: modalLoading },
);

export const Dnd5eCharacterSheetModalWithLocale = dynamic(
  () =>
    import("@/src/components/characters/Dnd5eCharacterSheetModal").then((m) => ({
      default: m.Dnd5eCharacterSheetModalWithLocale,
    })),
  { ssr: false, loading: modalLoading },
);

export const SessionEndWrapUpModal = dynamic(
  () =>
    import("@/src/components/session/SessionEndWrapUpModal").then((m) => ({
      default: m.SessionEndWrapUpModal,
    })),
  { ssr: false, loading: modalLoading },
);

export const BeastDefeatLootModal = dynamic(
  () =>
    import("@/src/components/session/BeastDefeatLootModal").then((m) => ({
      default: m.BeastDefeatLootModal,
    })),
  { ssr: false, loading: modalLoading },
);

export const GmNpcSearchModal = dynamic(
  () =>
    import("@/src/components/session/GmNpcSearchModal").then((m) => ({
      default: m.GmNpcSearchModal,
    })),
  { ssr: false, loading: modalLoading },
);

export const GmBeastSearchModal = dynamic(
  () =>
    import("@/src/components/session/GmBeastSearchModal").then((m) => ({
      default: m.GmBeastSearchModal,
    })),
  { ssr: false, loading: modalLoading },
);

export const DowntimePlayerOverlay = dynamic(
  () =>
    import("@/src/components/session/DowntimePlayerOverlay").then((m) => ({
      default: m.DowntimePlayerOverlay,
    })),
  { ssr: false, loading: modalLoading },
);

export const LiveStageShopOverlay = dynamic(
  () =>
    import("./LiveStageShopOverlay").then((m) => ({
      default: m.LiveStageShopOverlay,
    })),
  { ssr: false, loading: modalLoading },
);

export const ChronicleRecordingNoticeModal = dynamic(
  () =>
    import("@/src/components/session/ChronicleRecordingNoticeModal").then((m) => ({
      default: m.ChronicleRecordingNoticeModal,
    })),
  { ssr: false, loading: modalLoading },
);

export const DiceRollOverlay = dynamic(
  () =>
    import("@/src/components/session/dice/DiceRollOverlay").then((m) => ({
      default: m.DiceRollOverlay,
    })),
  { ssr: false, loading: modalLoading },
);

/** Battlemap: Chunk erst wenn Map aktiv / GM-Toolbar gerendert wird. */
export const BattlemapStage = dynamic(
  () =>
    import("@/src/components/session/battlemap/BattlemapStage").then((m) => ({
      default: m.BattlemapStage,
    })),
  { ssr: false, loading: modalLoading },
);

export const BattlemapGmToolbar = dynamic(
  () =>
    import("@/src/components/session/battlemap/BattlemapGmToolbar").then((m) => ({
      default: m.BattlemapGmToolbar,
    })),
  { ssr: false, loading: modalLoading },
);

export const BattlemapTokenTray = dynamic(
  () =>
    import("@/src/components/session/battlemap/BattlemapTokenTray").then((m) => ({
      default: m.BattlemapTokenTray,
    })),
  { ssr: false, loading: modalLoading },
);

export const CombatInitiativeBar = dynamic(
  () =>
    import("@/src/components/session/CombatInitiativeBar").then((m) => ({
      default: m.CombatInitiativeBar,
    })),
  { ssr: false, loading: modalLoading },
);

export const ChronicleMicMonitor = dynamic(
  () =>
    import("@/src/components/session/ChronicleMicMonitor").then((m) => ({
      default: m.ChronicleMicMonitor,
    })),
  { ssr: false, loading: modalLoading },
);

export const ChronicleLiveMarkerBar = dynamic(
  () =>
    import("@/src/components/session/ChronicleLiveMarkerBar").then((m) => ({
      default: m.ChronicleLiveMarkerBar,
    })),
  { ssr: false, loading: modalLoading },
);

export const ChronicleRecorderPanel = dynamic(
  () =>
    import("@/src/components/session/ChronicleRecorderPanel").then((m) => ({
      default: m.ChronicleRecorderPanel,
    })),
  { ssr: false, loading: modalLoading },
);

export const ChronicleMicTestPanel = dynamic(
  () =>
    import("@/src/components/session/ChronicleMicTestPanel").then((m) => ({
      default: m.ChronicleMicTestPanel,
    })),
  { ssr: false, loading: modalLoading },
);

export const ChronicleRecordingTopBar = dynamic(
  () =>
    import("@/src/components/session/ChronicleRecordingTopBar").then((m) => ({
      default: m.ChronicleRecordingTopBar,
    })),
  { ssr: false, loading: modalLoading },
);

export const ChronicleRecordingReminderBanner = dynamic(
  () =>
    import("@/src/components/session/ChronicleRecordingReminderBanner").then((m) => ({
      default: m.ChronicleRecordingReminderBanner,
    })),
  { ssr: false, loading: modalLoading },
);

export const ChronicleInboxFeed = dynamic(
  () =>
    import("@/src/components/chronicle/ChronicleInboxFeed").then((m) => ({
      default: m.ChronicleInboxFeed,
    })),
  { ssr: false, loading: modalLoading },
);
