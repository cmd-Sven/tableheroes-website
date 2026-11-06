/**
 * Guards gegen Reentrancy: profileOn → Scarcity → Stock/Pop-Serie → profileOn.
 * Keine Imports — absichtlich zyklenfrei.
 */

let populationDepth = 0;
let stockDepth = 0;

export function isPopulationBuilding() {
  return populationDepth > 0;
}

export function isVattrakStockBuilding() {
  return stockDepth > 0;
}

export function withPopulationBuilding<T>(fn: () => T): T {
  populationDepth += 1;
  try {
    return fn();
  } finally {
    populationDepth -= 1;
  }
}

export function withVattrakStockBuilding<T>(fn: () => T): T {
  stockDepth += 1;
  try {
    return fn();
  } finally {
    stockDepth -= 1;
  }
}
