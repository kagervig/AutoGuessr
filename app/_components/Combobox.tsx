"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/app/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  variant?: "game" | "admin";
  highlight?: boolean;
}

export default function Combobox({ value, onChange, options, placeholder, disabled, variant = "game", highlight = false }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const filtered = value
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" && filtered.length > 0) {
      onChange(filtered[0]);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        className={variant === "admin"
          ? `w-full text-sm text-black border rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 ${highlight ? "border-amber-400 bg-amber-50" : "border-gray-200"}`
          : cn(
            "w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3",
            "text-white font-bold placeholder:text-white/25",
            "focus:outline-none focus:border-primary transition-colors",
            "disabled:opacity-40"
          )
        }
      />
      {open && filtered.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className={variant === "admin"
            ? "absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded border border-gray-200 bg-white py-1 shadow-md"
            : "absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-white/10 bg-card py-1 shadow-xl"
          }
        >
          {filtered.slice(0, 50).map((option) => (
            <li
              key={option}
              role="option"
              aria-selected={value === option}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(option);
                setOpen(false);
              }}
              className={variant === "admin"
                ? cn(
                  "cursor-pointer px-3 py-1.5 text-sm transition-colors text-black",
                  value === option ? "bg-gray-100" : "hover:bg-gray-50"
                )
                : cn(
                  "cursor-pointer px-4 py-2 text-sm transition-colors",
                  value === option
                    ? "bg-primary/20 text-primary"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                )
              }
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
