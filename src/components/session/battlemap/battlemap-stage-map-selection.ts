/** Layer selection helpers — clear other selections when one layer is picked. */
type SelectionCallbacks = {
  onSelectProp?: (propId: string | null) => void;
  onSelectToken?: (tokenId: string | null) => void;
  onSelectFogShape?: (shapeId: string | null) => void;
  onSelectEffectTemplate?: (templateId: string | null) => void;
  onSelectMarker?: (markerId: string | null) => void;
  onSelectTrap?: (trapId: string | null) => void;
  onSelectContainer?: (containerId: string | null) => void;
};

export function buildBattlemapLayerSelectHandlers(callbacks: SelectionCallbacks) {
  const {
    onSelectProp,
    onSelectToken,
    onSelectFogShape,
    onSelectEffectTemplate,
    onSelectMarker,
    onSelectTrap,
    onSelectContainer,
  } = callbacks;

  return {
    onSelectFogShape: (id: string | null) => {
      onSelectFogShape?.(id);
      onSelectToken?.(null);
      onSelectProp?.(null);
      onSelectEffectTemplate?.(null);
      onSelectMarker?.(null);
      onSelectTrap?.(null);
      onSelectContainer?.(null);
    },
    onSelectEffectTemplate: (id: string | null) => {
      onSelectEffectTemplate?.(id);
      onSelectToken?.(null);
      onSelectProp?.(null);
      onSelectFogShape?.(null);
      onSelectMarker?.(null);
      onSelectTrap?.(null);
      onSelectContainer?.(null);
    },
    onSelectMarker: (id: string | null) => {
      onSelectMarker?.(id);
      onSelectToken?.(null);
      onSelectProp?.(null);
      onSelectFogShape?.(null);
      onSelectEffectTemplate?.(null);
      onSelectTrap?.(null);
      onSelectContainer?.(null);
    },
    onSelectTrap: (id: string | null) => {
      onSelectTrap?.(id);
      onSelectToken?.(null);
      onSelectProp?.(null);
      onSelectFogShape?.(null);
      onSelectEffectTemplate?.(null);
      onSelectMarker?.(null);
      onSelectContainer?.(null);
    },
    onSelectContainer: (id: string | null) => {
      onSelectContainer?.(id);
      onSelectToken?.(null);
      onSelectProp?.(null);
      onSelectFogShape?.(null);
      onSelectEffectTemplate?.(null);
      onSelectMarker?.(null);
      onSelectTrap?.(null);
    },
  };
}
