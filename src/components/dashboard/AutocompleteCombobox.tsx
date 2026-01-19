"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = {
  id: string;
  name: string;
};

type AutocompleteComboboxProps = {
  options: Option[];
  value: { id: string | null; name: string };
  onChange: (value: { id: string | null; name: string }) => void;
  placeholder?: string;
  label?: string;
};

export function AutocompleteCombobox({
  options,
  value,
  onChange,
  placeholder = "Suchen oder neu eingeben...",
  label,
}: AutocompleteComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value.name || "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value.name || "");
  }, [value.name]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  function handleSelect(option: Option) {
    onChange({ id: option.id, name: option.name });
    setInputValue(option.name);
    setIsOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    // Wenn der User tippt, setze ID auf null (neuer Eintrag)
    const matchingOption = options.find(
      (opt) => opt.name.toLowerCase() === newValue.toLowerCase()
    );
    if (!matchingOption) {
      onChange({ id: null, name: newValue });
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white placeholder-gray-500 focus:border-hero-vibrant outline-none pr-10"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-hero-dark bg-background-card shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              className={`w-full text-left px-4 py-2 hover:bg-hero-dark transition-colors flex items-center gap-2 ${
                value.id === option.id ? "bg-hero-dark" : ""
              }`}
            >
              {value.id === option.id && <Check className="h-4 w-4 text-accent-gold" />}
              <span className="font-libre text-white">{option.name}</span>
            </button>
          ))}
        </div>
      )}
      {value.id === null && value.name && (
        <p className="mt-1 text-xs text-accent-gold font-libre">
          ✨ Neuer Eintrag: "{value.name}" wird erstellt
        </p>
      )}
    </div>
  );
}





