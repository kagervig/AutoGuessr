"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ModeCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  featured?: boolean;
  onClick: () => void;
  className?: string;
}

export function ModeCard({ title, description, icon, selected, featured, onClick, className }: ModeCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative text-left group overflow-hidden rounded-xl transition-all duration-300",
        "border-2",
        selected
          ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(220,38,38,0.15)]"
          : "border-white/5 bg-card hover:border-white/20 hover:bg-card/80",
        featured ? "p-8" : "p-6",
        className
      )}
    >
      {/* Background gradient on hover/select */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 transition-opacity duration-300",
        selected ? "opacity-100" : "group-hover:opacity-50"
      )} />

      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-3 rounded-lg transition-colors duration-300",
            selected ? "bg-primary text-white" : "bg-white/5 text-muted-foreground group-hover:text-white group-hover:bg-white/10"
          )}>
            {icon}
          </div>

          {selected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-primary text-white p-1 rounded-full"
            >
              <Check className="w-4 h-4" />
            </motion.div>
          )}
        </div>

        <div className="mt-auto">
          {featured && (
            <div className="text-xs font-bold tracking-widest text-primary mb-2 uppercase">
              Recommended
            </div>
          )}
          <h3 className={cn(
            "font-display font-bold uppercase tracking-wide mb-2 transition-colors",
            featured ? "text-3xl" : "text-xl"
          )}>
            {title}
          </h3>
          <p className={cn(
            "text-sm leading-relaxed transition-colors",
            selected ? "text-white/80" : "text-muted-foreground group-hover:text-white/70"
          )}>
            {description}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
