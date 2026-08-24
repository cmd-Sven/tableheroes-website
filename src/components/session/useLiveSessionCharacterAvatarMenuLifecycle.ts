/** Radial menu open/close, anchor tracking, and battlemap token draft sync. */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHARACTER_DISPLAY_CHANGED_EVENT,
  OPEN_CHARACTER_RADIAL_EVENT,
  type OpenCharacterRadialDetail,
} from "@/src/lib/session/character-radial-bridge";
import type { NpcTokenSizeCategory } from "@/src/lib/npcs/npc-sheet-types";
import {
  type AnchorRect,
  type RadialPanel,
  sizeCategoryFromCells,
} from "./live-session-character-avatar.constants";

type BattlemapTokenDraft = {
  id: string;
  showHpBar: boolean;
  sizeCells: number;
} | null;

type Args = {
  characterId: string;
  canInteract: boolean;
  isDummy: boolean;
  battlemapToken: BattlemapTokenDraft;
  reload: () => Promise<unknown>;
};

export function useLiveSessionCharacterAvatarMenuLifecycle({
  characterId,
  canInteract,
  isDummy,
  battlemapToken,
  reload,
}: Args) {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<RadialPanel>(null);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [tokenShowHpBar, setTokenShowHpBar] = useState(false);
  const [tokenSizeCategory, setTokenSizeCategory] =
    useState<NpcTokenSizeCategory>("medium");
  const [activeBattlemapTokenId, setActiveBattlemapTokenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const openedFromMapRef = useRef(false);

  const updateAnchor = useCallback(() => {
    const el = avatarBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      top: r.top,
      width: r.width,
      height: r.height,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function applyTokenDraft(token: {
      tokenId: string;
      showHpBar: boolean;
      sizeCells: number;
    }) {
      setActiveBattlemapTokenId(token.tokenId);
      setTokenShowHpBar(token.showHpBar);
      setTokenSizeCategory(sizeCategoryFromCells(token.sizeCells));
    }

    function onOpenRadial(e: Event) {
      const detail = (e as CustomEvent<OpenCharacterRadialDetail>).detail;
      if (!detail || detail.characterId !== characterId) return;
      if (!canInteract || isDummy) return;
      openedFromMapRef.current = true;
      if (detail.battlemapToken) {
        applyTokenDraft(detail.battlemapToken);
      } else if (battlemapToken) {
        applyTokenDraft({
          tokenId: battlemapToken.id,
          showHpBar: battlemapToken.showHpBar,
          sizeCells: battlemapToken.sizeCells,
        });
      }
      setMenuOpen(true);
      setPanel(null);
      setAnchor({
        cx: detail.clientX,
        cy: detail.clientY,
        top: detail.clientY,
        width: 0,
        height: 0,
      });
      void reload();
    }
    function onDisplayChanged(e: Event) {
      const detail = (e as CustomEvent<{ characterId: string }>).detail;
      if (!detail || detail.characterId !== characterId) return;
      void reload();
    }
    window.addEventListener(OPEN_CHARACTER_RADIAL_EVENT, onOpenRadial);
    window.addEventListener(CHARACTER_DISPLAY_CHANGED_EVENT, onDisplayChanged);
    return () => {
      window.removeEventListener(OPEN_CHARACTER_RADIAL_EVENT, onOpenRadial);
      window.removeEventListener(CHARACTER_DISPLAY_CHANGED_EVENT, onDisplayChanged);
    };
  }, [battlemapToken, canInteract, characterId, isDummy, reload]);

  useEffect(() => {
    if (!battlemapToken) {
      setActiveBattlemapTokenId(null);
      return;
    }
    setActiveBattlemapTokenId(battlemapToken.id);
    if (panel !== "token_settings") {
      setTokenShowHpBar(battlemapToken.showHpBar);
      setTokenSizeCategory(sizeCategoryFromCells(battlemapToken.sizeCells));
    }
  }, [battlemapToken, panel]);

  useEffect(() => {
    if (!menuOpen) return;
    if (!openedFromMapRef.current) {
      updateAnchor();
    }
    function onScrollOrResize() {
      if (openedFromMapRef.current) return;
      updateAnchor();
    }
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [menuOpen, updateAnchor]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (overlayRef.current?.contains(target)) return;
      if (avatarBtnRef.current?.contains(target)) return;
      setMenuOpen(false);
      setPanel(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setPanel(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function handleAvatarClick() {
    if (!canInteract || isDummy) return;
    openedFromMapRef.current = false;
    if (battlemapToken) {
      setActiveBattlemapTokenId(battlemapToken.id);
      setTokenShowHpBar(battlemapToken.showHpBar);
      setTokenSizeCategory(sizeCategoryFromCells(battlemapToken.sizeCells));
    }
    setMenuOpen((v) => !v);
    setPanel(null);
    requestAnimationFrame(() => updateAnchor());
    void reload();
  }

  return {
    mounted,
    menuOpen,
    setMenuOpen,
    panel,
    setPanel,
    anchor,
    tokenShowHpBar,
    setTokenShowHpBar,
    tokenSizeCategory,
    setTokenSizeCategory,
    activeBattlemapTokenId,
    rootRef,
    avatarBtnRef,
    overlayRef,
    openedFromMapRef,
    updateAnchor,
    handleAvatarClick,
  };
}
