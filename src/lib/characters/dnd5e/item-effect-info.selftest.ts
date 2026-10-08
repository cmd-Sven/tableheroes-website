/**
 * Wirkungstexte für Magie/Tränke/Rollen und Gürtel-Freigabe für Waffen.
 * Run: npx tsx src/lib/characters/dnd5e/item-effect-info.selftest.ts
 */
import assert from "node:assert/strict";
import type { CharacterItem } from "@/src/types/inventory";
import { createEmptyCustomItemMeta, buildItemDescription } from "./item-meta";
import { resolveItemEffectInfo } from "./item-effect-info";
import { validateItemForBelt, validateItemForSlot } from "./slot-validation";

function item(partial: Pick<CharacterItem, "name" | "description" | "category">): CharacterItem {
  return {
    id: "item-1",
    character_id: "char-1",
    icon_type: null,
    is_deleted: false,
    target_fap: 0,
    current_fap: 0,
    ...partial,
  };
}

const healing = item({
  name: "Heiltrank",
  category: "Consumable",
  description: null,
});
const healingInfo = resolveItemEffectInfo(healing, "de");
assert.ok(healingInfo?.isPotion);
assert.equal(healingInfo?.isMagical, false);
assert.match(healingInfo?.body ?? "", /2W4 \+ 2/);
assert.ok(healingInfo?.dice.some((dice) => dice.replace(/\s+/g, "") === "2W4+2"));

const scroll = item({
  name: "Spruchrolle (Feuerball)",
  category: "Consumable",
  description: buildItemDescription({
    meta: {
      ...createEmptyCustomItemMeta("consumable"),
      inventoryCategory: "scrolls",
      isMagical: true,
      effect: null,
    },
  }),
});
const scrollInfo = resolveItemEffectInfo(scroll, "de");
assert.ok(scrollInfo?.isScroll);
assert.ok(scrollInfo?.isMagical);
assert.equal(scrollInfo?.spellName, "Feuerball");
assert.equal(scrollInfo?.spellLevel, 3);
assert.match(scrollInfo?.body ?? "", /8W6/);
assert.ok(scrollInfo?.dice.some((dice) => dice.toUpperCase().startsWith("8W6")));

const emptyMagic = item({
  name: "Ring ohne Text",
  category: "Equipment",
  description: buildItemDescription({
    meta: { ...createEmptyCustomItemMeta("magic"), effect: null },
  }),
});
const emptyMagicInfo = resolveItemEffectInfo(emptyMagic, "de");
assert.ok(emptyMagicInfo?.isMagical);
assert.equal(emptyMagicInfo?.body, null);

const rope = item({ name: "Seil", category: "Equipment", description: null });
assert.equal(resolveItemEffectInfo(rope, "de"), null);

const sword = item({
  name: "Langschwert",
  category: "Weapon",
  description: buildItemDescription({
    meta: { ...createEmptyCustomItemMeta("weapon"), isMagical: true, magicalBonus: 1, damage: "1W8" },
  }),
});
assert.equal(validateItemForBelt(sword).valid, true);
assert.equal(validateItemForSlot(sword, "mainHand").valid, true);
assert.equal(validateItemForSlot(sword, "chest").valid, false);
assert.equal(validateItemForSlot(sword, "offHand").valid, true);
const swordInfo = resolveItemEffectInfo(sword, "de");
assert.ok(swordInfo?.isMagical);
assert.equal(swordInfo?.magicalBonus, 1);

const namedShieldWeapon = item({
  name: "Sword of Shielding",
  category: "Weapon",
  description: buildItemDescription({
    meta: { ...createEmptyCustomItemMeta("weapon"), isMagical: true },
  }),
});
assert.equal(validateItemForBelt(namedShieldWeapon).valid, true);

const armor = item({
  name: "Kettenhemd",
  category: "Equipment",
  description: buildItemDescription({
    meta: { ...createEmptyCustomItemMeta("armor"), acFormula: "16" },
  }),
});
assert.equal(validateItemForBelt(armor).valid, false);
assert.equal(validateItemForSlot(armor, "chest").valid, true);

const shield = item({
  name: "Schild",
  category: "Equipment",
  description: buildItemDescription({
    meta: { ...createEmptyCustomItemMeta("armor"), isShield: true, acFormula: "+2" },
  }),
});
assert.equal(validateItemForBelt(shield).valid, false);
assert.equal(validateItemForSlot(shield, "offHand").valid, true);
assert.equal(validateItemForSlot(shield, "mainHand").valid, false);

console.log("item-effect-info.selftest ok");
