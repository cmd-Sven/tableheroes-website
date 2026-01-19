"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { createFactionQuick } from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { VALID_FACTION_TYPES } from "@/src/lib/faction-types";

type Faction = { id: string; name: string; type?: string };
type Location = { id: string; name: string; type: string };

type Props = {
  campaignId: string;
  factions: Faction[];
  locations: Location[];
  value: string;
  onChange: (factionId: string) => void;
  placeholder?: string;
  label?: string;
  onFactionCreated?: (faction: Faction) => void;
};

export function SmartFactionCombobox({
  campaignId,
  factions,
  locations,
  value,
  onChange,
  placeholder = "-- Keine Fraktion --",
  label,
  onFactionCreated,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    name: "",
    type: VALID_FACTION_TYPES[0] || "Gilde",
    location_id: "",
    location_name: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedFaction = factions.find((faction) => faction.id === value);
  
  // Der Input-Wert ist immer der searchTerm, außer wenn nichts getippt wurde und eine Fraktion ausgewählt ist
  // Wichtig: Wenn der User tippt, muss searchTerm immer den aktuellen Wert haben
  const inputValue = searchTerm !== null && searchTerm !== undefined ? searchTerm : (selectedFaction?.name || "");

  // Filter factions based on search term
  const filteredFactions = searchTerm.trim() === "" 
    ? factions 
    : factions.filter((faction) =>
        faction.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

  // Check if search term matches an existing faction exactly
  const exactMatch = searchTerm.trim() !== "" 
    ? factions.find(
        (faction) => faction.name.toLowerCase() === searchTerm.toLowerCase().trim()
      )
    : null;

  // Show "create new" option if search term doesn't match and is not empty
  const showCreateOption = searchTerm.trim() !== "" && !exactMatch && !showQuickAdd;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset searchTerm only if no faction is selected
        if (!value) {
          setSearchTerm("");
        } else {
          // Keep the selected faction name
          setSearchTerm(selectedFaction?.name || "");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, selectedFaction]);

  // Sync searchTerm with selected faction when value changes externally (but only if not currently typing)
  useEffect(() => {
    if (value && selectedFaction) {
      // Only update if searchTerm is empty or matches the old selection
      if (!searchTerm || searchTerm === "" || searchTerm === selectedFaction.name) {
        setSearchTerm(selectedFaction.name);
      }
    } else if (!value && !isOpen) {
      // Only clear if dropdown is closed
      setSearchTerm("");
    }
  }, [value, selectedFaction?.id]); // Only depend on ID, not name, to avoid loops

  const handleSelect = (factionId: string) => {
    onChange(factionId);
    const selected = factions.find((f) => f.id === factionId);
    setSearchTerm(selected?.name || "");
    setIsOpen(false);
  };

  const handleCreateClick = () => {
    setQuickAddData((prev) => ({ ...prev, name: searchTerm.trim() }));
    setShowQuickAdd(true);
    setIsOpen(false); // Close dropdown, show inline panel instead
  };

  const handleQuickAddSubmit = async () => {
    if (!quickAddData.name.trim()) return;

    setIsCreating(true);
    try {
      // If location_name is set but not an ID, create location first
      let locationId = quickAddData.location_id || null;
      
      if (quickAddData.location_name.trim() && !locationId) {
        // Import createLocationQuick dynamically
        const { createLocationQuick } = await import("@/src/app/dashboard/campaigns/[id]/location-actions");
        // Create location as ghost entity
        const newLocation = await createLocationQuick({
          campaign_id: campaignId,
          name: quickAddData.location_name.trim(),
          type: "Ort", // Default type for ghost entities
          description: null,
        });
        locationId = newLocation.id;
        // Note: We can't add the location to the locations list here because
        // this component doesn't have access to onLocationCreated.
        // The location will be available in the next render cycle.
      }

      // Create the faction
      const newFaction = await createFactionQuick({
        campaign_id: campaignId,
        name: quickAddData.name.trim(),
        type: quickAddData.type,
        location_id: locationId,
        description: null,
      });

      onChange(newFaction.id);
      setSearchTerm(newFaction.name);
      setShowQuickAdd(false);
      setQuickAddData({ name: "", type: VALID_FACTION_TYPES[0] || "Gilde", location_id: "", location_name: "" });
      setIsOpen(false);

      // Callback nach State-Update, damit die neue Faction in der Liste erscheint
      if (onFactionCreated) {
        onFactionCreated(newFaction);
      }
    } catch (error: any) {
      alert(error.message || "Fehler beim Erstellen der Fraktion.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setSearchTerm(newValue);
            setIsOpen(true);
            // Reset selection if user starts typing something different
            if (value && selectedFaction && newValue !== selectedFaction.name) {
              onChange("");
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            // If there's a selected faction, start with its name
            if (value && selectedFaction) {
              setSearchTerm(selectedFaction.name);
            }
          }}
          placeholder={placeholder}
          className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none transition-all focus:border-hero-vibrant pr-10"
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen && value && selectedFaction) {
              setSearchTerm(selectedFaction.name);
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-hero-dark rounded transition-colors"
        >
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Inline Quick-Add Panel (erscheint direkt unter dem Input, nicht im Dropdown) */}
      {showQuickAdd && (
        <div className="mt-2 p-4 space-y-4 border-2 border-hero-border rounded-lg bg-background-card shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-barlow font-bold text-sm uppercase text-hero-vibrant">
              Neue Fraktion erstellen
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowQuickAdd(false);
                setQuickAddData({ name: "", type: VALID_FACTION_TYPES[0] || "Gilde", location_id: "", location_name: "" });
                setSearchTerm(value ? selectedFaction?.name || "" : "");
              }}
              className="p-1 hover:bg-hero-dark rounded"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div>
            <label className="block mb-1 font-barlow font-semibold text-xs text-gray-400">
              Name *
            </label>
            <input
              type="text"
              value={quickAddData.name}
              onChange={(e) => setQuickAddData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant text-sm"
              placeholder="Name der Fraktion"
            />
          </div>

          <div>
            <label className="block mb-1 font-barlow font-semibold text-xs text-gray-400">
              Typ *
            </label>
            <select
              value={quickAddData.type}
              onChange={(e) => setQuickAddData((prev) => ({ ...prev, type: e.target.value as any }))}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant text-sm"
            >
              {VALID_FACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-barlow font-semibold text-xs text-gray-400">
              Hauptsitz in... (optional)
            </label>
            <input
              type="text"
              value={quickAddData.location_name}
              onChange={(e) => {
                const name = e.target.value;
                setQuickAddData((prev) => {
                  // Check if name matches an existing location
                  const match = locations.find((loc) => loc.name.toLowerCase() === name.toLowerCase());
                  return {
                    ...prev,
                    location_name: name,
                    location_id: match?.id || "",
                  };
                });
              }}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant text-sm"
              placeholder="Name des Ortes (wird erstellt, falls nicht vorhanden)"
              list="faction-locations"
            />
            <datalist id="faction-locations">
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name} />
              ))}
            </datalist>
          </div>

          <button
            type="button"
            onClick={handleQuickAddSubmit}
            disabled={!quickAddData.name.trim() || isCreating}
            className="w-full rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "Erstelle..." : "Fraktion erstellen"}
          </button>
        </div>
      )}

      {/* Dropdown mit Suchergebnissen */}
      {isOpen && !showQuickAdd && (
        <div className="absolute z-50 w-full mt-1 bg-slate-900 border-2 border-hero-border rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {filteredFactions.length > 0 && (
            <div className="p-2">
              {filteredFactions.map((faction) => (
                <button
                  key={faction.id}
                  type="button"
                  onClick={() => handleSelect(faction.id)}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-hero-dark transition-colors flex items-center justify-between ${
                    value === faction.id ? "bg-hero-vibrant/20" : ""
                  }`}
                >
                  <span className="font-libre text-white">
                    {faction.name} {faction.type && <span className="text-gray-400">({faction.type})</span>}
                  </span>
                  {value === faction.id && <Check className="h-4 w-4 text-hero-vibrant" />}
                </button>
              ))}
            </div>
          )}

          {showCreateOption && (
            <div className={`${filteredFactions.length > 0 ? "border-t border-hero-border" : ""} p-2`}>
              <button
                type="button"
                onClick={handleCreateClick}
                className="w-full text-left px-3 py-2 rounded hover:bg-hero-dark transition-colors flex items-center gap-2 text-hero-vibrant"
              >
                <Plus className="h-4 w-4" />
                <span className="font-libre">
                  "{searchTerm}" als neue Fraktion erstellen
                </span>
              </button>
            </div>
          )}

          {filteredFactions.length === 0 && !showCreateOption && searchTerm.trim() === "" && (
            <div className="p-4 text-center text-gray-400 font-libre">
              Tippen Sie, um zu suchen oder eine neue Fraktion zu erstellen
            </div>
          )}
        </div>
      )}
    </div>
  );
}

