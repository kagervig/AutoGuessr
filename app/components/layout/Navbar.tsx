"use client";

// Top navigation bar with mobile hamburger menu.
import { useState } from "react";
import Link from "next/link";
import { Flag, Trophy, TrendingUp, Search, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/scoring", icon: TrendingUp, label: "SCORING" },
  { href: "/leaderboard", icon: Trophy, label: "LEADERBOARD" },
  { href: "/identify", icon: Search, label: "COMMUNITY" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 glass-panel border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-black transform -skew-x-12 group-hover:scale-110 transition-transform">
              <Flag className="w-5 h-5 fill-current" />
            </div>
            <span className="font-display font-black text-xl tracking-widest italic text-white group-hover:text-primary transition-colors">
              AUTOGUESSR
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6">
            {NAV_LINKS.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-semibold tracking-wider text-muted-foreground hover:text-white transition-colors flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 text-muted-foreground hover:text-white transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-white/5 glass-panel">
          {NAV_LINKS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-6 py-4 text-sm font-semibold tracking-wider text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
