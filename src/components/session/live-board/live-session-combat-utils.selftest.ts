/**
 * Bühnen-Initiative: anwesende Spieler und Monster-Marker, ohne Battlemap-Tokens.
 * Run: npx tsx src/components/session/live-board/live-session-combat-utils.selftest.ts
 */
import assert from "node:assert/strict";
import {
  explicitInitiativeDisplay,
  formatMonsterMarkerName,
  isStagePresentPlayer,
  presentStagePlayerTokens,
} from "./live-session-combat-utils";
import type { PartyCharacter } from "./live-session-types";

function player(
  partial: Pick<PartyCharacter, "id" | "name"> &
    Partial<Pick<PartyCharacter, "playerUserId" | "isSessionDummy">>,
): PartyCharacter {
  return {
    id: partial.id,
    name: partial.name,
    class: null,
    race: null,
    level: null,
    avatar_url: null,
    playerUserId: partial.playerUserId ?? null,
    rations_count: 0,
    starvation_days: 0,
    isSessionDummy: partial.isSessionDummy,
  };
}

function run() {
  const online = new Set(["u-online"]);
  const table = new Set(["u-table"]);

  assert.equal(
    isStagePresentPlayer(
      { playerUserId: "u-online", isSessionDummy: false },
      online,
      table,
    ),
    true,
  );
  assert.equal(
    isStagePresentPlayer(
      { playerUserId: "u-table", isSessionDummy: false },
      online,
      table,
    ),
    true,
  );
  assert.equal(
    isStagePresentPlayer(
      { playerUserId: "u-away", isSessionDummy: false },
      online,
      table,
    ),
    false,
  );
  assert.equal(
    isStagePresentPlayer({ playerUserId: null, isSessionDummy: false }, online, table),
    false,
  );
  assert.equal(
    isStagePresentPlayer({ playerUserId: null, isSessionDummy: true }, online, table),
    true,
  );

  const tokens = presentStagePlayerTokens(
    [
      player({ id: "1", name: "Arya", playerUserId: "u-online" }),
      player({ id: "2", name: "Bram", playerUserId: "u-away" }),
      player({ id: "3", name: "Cira", playerUserId: "u-table" }),
      player({ id: "4", name: "Spieler 1", isSessionDummy: true }),
      player({ id: "5", name: "Arya", playerUserId: "u-online" }),
    ],
    online,
    table,
  );
  assert.deepEqual(
    tokens.map((token) => token.name),
    ["Arya", "Cira", "Spieler 1"],
  );
  assert.ok(tokens.every((token) => token.type === "player"));

  assert.equal(formatMonsterMarkerName("Goblin", 2), "Goblin 2");
  assert.equal(formatMonsterMarkerName("  Ork   Krieger ", 1), "Ork Krieger 1");
  assert.equal(formatMonsterMarkerName("Goblin", 0), "");
  assert.equal(formatMonsterMarkerName("   ", 3), "");

  assert.equal(explicitInitiativeDisplay("17"), "17");
  assert.equal(explicitInitiativeDisplay("17-1"), "17-1");
  assert.equal(explicitInitiativeDisplay(" 14 "), "14");
  assert.equal(explicitInitiativeDisplay(""), null);
  assert.equal(explicitInitiativeDisplay("hoch"), null);

  console.log("live-session-combat-utils.selftest: ok");
}

run();
