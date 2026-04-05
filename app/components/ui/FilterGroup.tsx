"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterGroupProps {
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
}

export function FilterGroup({ title, options, selectedValues, onChange }: FilterGroupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasSelection = selectedValues.length > 0;

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <div className="border border-white/10 rounded-xl bg-card/50 overflow-hidden backdrop-blur-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h4 className="font-display font-bold tracking-wider text-sm text-white">
            {title}
          </h4>
          {hasSelection && (
            <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {selectedValues.length}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 pt-2 flex flex-wrap gap-2">
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border",
                      isSelected
                        ? "bg-primary border-primary text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white hover:border-white/20"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
