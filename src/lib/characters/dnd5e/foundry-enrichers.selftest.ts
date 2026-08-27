/**
 * Selftest: Foundry-Enricher → Plaintext-Label.
 * Run: npx tsx src/lib/characters/dnd5e/foundry-enrichers.selftest.ts
 */
import assert from "node:assert/strict";
import { stripFoundryEnrichers } from "./foundry-enrichers";

assert.equal(
  stripFoundryEnrichers(
    "@Compendium[dnd5e.classfeatures.VoR0SUrNX5EJVPIO]{Kampfrausch}",
  ),
  "Kampfrausch",
);

assert.equal(
  stripFoundryEnrichers(
    "Siehst du @UUID[Compendium.dnd5e.spells.Item.abc]{Feuerball} fliegen?",
  ),
  "Siehst du Feuerball fliegen?",
);

assert.equal(
  stripFoundryEnrichers("Wurf [[/r 1d20+5]]{Angriff} und @Damage[[1d8]] Schaden."),
  "Wurf Angriff und 1d8 Schaden.",
);

assert.equal(
  stripFoundryEnrichers("&Reference[prone]{Liegend} oder &Reference[blinded]"),
  "Liegend oder blinded",
);

assert.equal(stripFoundryEnrichers("@Compendium[dnd5e.foo.bar]"), "");

assert.equal(stripFoundryEnrichers(null), "");
assert.equal(stripFoundryEnrichers("  "), "");

console.log("foundry-enrichers.selftest: ok");
