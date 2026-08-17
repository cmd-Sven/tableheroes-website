"use client";

import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  Barrel,
  Book,
  Castle,
  Coins,
  Flame,
  Gem,
  House,
  Landmark,
  MapPin,
  Mountain,
  MountainSnow,
  Route,
  Ship,
  Skull,
  Sword,
  UtensilsCrossed,
} from "lucide-react";
import type { WorldMapIconKey } from "./types";

/** Lucide-Komponenten zu den dokumentierten Icon-Keys. */
export const WORLD_MAP_ICON_COMPONENTS: Record<WorldMapIconKey, LucideIcon> = {
  book: Book,
  coins: Coins,
  castle: Castle,
  house: House,
  campfire: Flame,
  barrel: Barrel,
  utensils: UtensilsCrossed,
  dragon: Skull, // keine Lucide-Dragon — Skull als Näherung
  mountain: Mountain,
  ship: Ship,
  anchor: Anchor,
  tower: Landmark,
  sword: Sword,
  gem: Gem,
  cave: MountainSnow,
  path: Route,
  marker: MapPin,
};

export function WorldMapIcon({
  icon,
  className,
}: {
  icon: WorldMapIconKey;
  className?: string;
}) {
  const Comp = WORLD_MAP_ICON_COMPONENTS[icon] ?? MapPin;
  return <Comp className={className} aria-hidden />;
}
