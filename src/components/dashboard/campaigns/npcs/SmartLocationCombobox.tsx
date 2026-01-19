"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { createLocationQuick } from "@/src/app/dashboard/campaigns/[id]/location-actions";
import { VALID_LORE_TYPES } from "@/src/lib/lore-types";

type Location = { id: string; name: string; type: string };

type Props = {
  campaignId: string;
  locations: Location[];
  value: string;
  onChange: (locationId: string) => void;
  placeholder?: string;
  label?: string;
  onLocationCreated?: (location: Location) => void;
};

const GEOGRAPHICAL_TYPES = ["Stadt", "Region", "Ort", "Insel", "Gebäude", "Tempel", "Land", "Dungeon", "Akademie", "Markt", "Laden"];

export function SmartLocationCombobox({
  campaignId,
  locations,
  value,
  onChange,
  placeholder = "-- Kein Ort --",
  label,
  onLocationCreated,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    name: "",
    type: "Ort",
    parent_location_id: "",
    parent_location_name: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLocation = locations.find((loc) => loc.id === value);
  
  // Der Input-Wert ist immer der searchTerm, außer wenn nichts getippt wurde und ein Ort ausgewählt ist
  // Wichtig: Wenn der User tippt, muss searchTerm immer den aktuellen Wert haben
  const inputValue = searchTerm !== null && searchTerm !== undefined ? searchTerm : (selectedLocation?.name || "");

  // Filter locations based on search term
  const filteredLocations = searchTerm.trim() === "" 
    ? locations 
    : locations.filter((loc) =>
        loc.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

  // Check if search term matches an existing location exactly
  const exactMatch = searchTerm.trim() !== "" 
    ? locations.find(
        (loc) => loc.name.toLowerCase() === searchTerm.toLowerCase().trim()
      )
    : null;

  // Show "create new" option if search term doesn't match and is not empty
  const showCreateOption = searchTerm.trim() !== "" && !exactMatch && !showQuickAdd;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset searchTerm only if no location is selected
        if (!value) {
          setSearchTerm("");
        } else {
          // Keep the selected location name
          setSearchTerm(selectedLocation?.name || "");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, selectedLocation]);

  // Sync searchTerm with selected location when value changes externally (but only if not currently typing)
  useEffect(() => {
    if (value && selectedLocation) {
      // Only update if searchTerm is empty or matches the old selection
      if (!searchTerm || searchTerm === "" || searchTerm === selectedLocation.name) {
        setSearchTerm(selectedLocation.name);
      }
    } else if (!value && !isOpen) {
      // Only clear if dropdown is closed
      setSearchTerm("");
    }
  }, [value, selectedLocation?.id]); // Only depend on ID, not name, to avoid loops

  const handleSelect = (locationId: string) => {
    onChange(locationId);
    const selected = locations.find((loc) => loc.id === locationId);
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
      // If parent_location_name is set but not an ID, create parent first
      let parentId = quickAddData.parent_location_id || null;
      
      if (quickAddData.parent_location_name.trim() && !parentId) {
        // Create parent location as ghost entity
        const parentLocation = await createLocationQuick({
          campaign_id: campaignId,
          name: quickAddData.parent_location_name.trim(),
          type: "Region", // Default type for ghost entities
          description: null,
        });
        parentId = parentLocation.id;
        // Add parent location to the list via callback
        if (onLocationCreated) {
          onLocationCreated(parentLocation);
        }
      }

      // Create the location
      const newLocation = await createLocationQuick({
        campaign_id: campaignId,
        name: quickAddData.name.trim(),
        type: quickAddData.type,
        parent_location_id: parentId,
        description: null,
      });

      onChange(newLocation.id);
      setSearchTerm(newLocation.name);
      setShowQuickAdd(false);
      setQuickAddData({ name: "", type: "Ort", parent_location_id: "", parent_location_name: "" });
      setIsOpen(false);

      // Callback nach State-Update, damit die neue Location in der Liste erscheint
      if (onLocationCreated) {
        onLocationCreated(newLocation);
      }
    } catch (error: any) {
      alert(error.message || "Fehler beim Erstellen des Ortes.");
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
            if (value && selectedLocation && newValue !== selectedLocation.name) {
              onChange("");
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            // If there's a selected location, start with its name
            if (value && selectedLocation) {
              setSearchTerm(selectedLocation.name);
            }
          }}
          placeholder={placeholder}
          className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none transition-all focus:border-hero-vibrant pr-10"
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen && value && selectedLocation) {
              setSearchTerm(selectedLocation.name);
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
              Neuen Ort erstellen
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowQuickAdd(false);
                setQuickAddData({ name: "", type: "Ort", parent_location_id: "", parent_location_name: "" });
                setSearchTerm(value ? selectedLocation?.name || "" : "");
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
              placeholder="Name des Ortes"
            />
          </div>

          <div>
            <label className="block mb-1 font-barlow font-semibold text-xs text-gray-400">
              Typ *
            </label>
            <select
              value={quickAddData.type}
              onChange={(e) => setQuickAddData((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant text-sm"
            >
              {GEOGRAPHICAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-barlow font-semibold text-xs text-gray-400">
              Liegt in... (optional)
            </label>
            <input
              type="text"
              value={quickAddData.parent_location_name}
              onChange={(e) => {
                const name = e.target.value;
                setQuickAddData((prev) => {
                  // Check if name matches an existing location
                  const match = locations.find((loc) => loc.name.toLowerCase() === name.toLowerCase());
                  return {
                    ...prev,
                    parent_location_name: name,
                    parent_location_id: match?.id || "",
                  };
                });
              }}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant text-sm"
              placeholder="Name des Parent-Ortes (wird erstellt, falls nicht vorhanden)"
              list="parent-locations"
            />
            <datalist id="parent-locations">
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
            {isCreating ? "Erstelle..." : "Ort erstellen"}
          </button>
        </div>
      )}

      {/* Dropdown mit Suchergebnissen */}
      {isOpen && !showQuickAdd && (
        <div className="absolute z-50 w-full mt-1 bg-slate-900 border-2 border-hero-border rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {filteredLocations.length > 0 && (
            <div className="p-2">
              {filteredLocations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => handleSelect(location.id)}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-hero-dark transition-colors flex items-center justify-between ${
                    value === location.id ? "bg-hero-vibrant/20" : ""
                  }`}
                >
                  <span className="font-libre text-white">
                    {location.name} <span className="text-gray-400">({location.type})</span>
                  </span>
                  {value === location.id && <Check className="h-4 w-4 text-hero-vibrant" />}
                </button>
              ))}
            </div>
          )}

          {showCreateOption && (
            <div className={`${filteredLocations.length > 0 ? "border-t border-hero-border" : ""} p-2`}>
              <button
                type="button"
                onClick={handleCreateClick}
                className="w-full text-left px-3 py-2 rounded hover:bg-hero-dark transition-colors flex items-center gap-2 text-hero-vibrant"
              >
                <Plus className="h-4 w-4" />
                <span className="font-libre">
                  "{searchTerm}" als neuen Ort erstellen
                </span>
              </button>
            </div>
          )}

          {filteredLocations.length === 0 && !showCreateOption && searchTerm.trim() === "" && (
            <div className="p-4 text-center text-gray-400 font-libre">
              Tippen Sie, um zu suchen oder einen neuen Ort zu erstellen
            </div>
          )}
        </div>
      )}

    </div>
  );
}

