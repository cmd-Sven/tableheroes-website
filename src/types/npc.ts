/**
 * Narrative Hook Type
 * 
 * Repräsentiert eine Story-Opportunity, die aus der Hintergrundgeschichte eines NPCs
 * extrahiert wurde. Diese Hooks können verwendet werden, um verwandte NPCs zu generieren.
 */
export type NarrativeHook = {
  name?: string;       // Der Name, falls im Text erwähnt (z.B. "Nilidah")
  role: string;        // Die Beziehung/Rolle (z.B. "Schwester", "Erzfeind", "Mentor")
  description: string; // Kurzer Kontext (z.B. "Wurde aus der Gilde verstoßen")
  is_alive: boolean;   // Steuert, ob der Hook generierbar ist
};


