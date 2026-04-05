import Link from "next/link";
import { Flag, Trophy, User } from "lucide-react";

export function Navbar() {
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

          <div className="flex items-center gap-6">
            <Link
              href="/leaderboard"
              className="text-sm font-semibold tracking-wider text-muted-foreground hover:text-white transition-colors flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">LEADERBOARD</span>
            </Link>
            <button className="text-sm font-semibold tracking-wider text-muted-foreground hover:text-white transition-colors flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">PROFILE</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
