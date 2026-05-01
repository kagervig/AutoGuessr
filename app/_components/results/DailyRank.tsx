"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp } from "lucide-react";

interface RankData {
  rank: number;
  totalPlayers: number;
  percentile: number;
}

interface Props {
  gameId: string;
}

export function DailyRank({ gameId }: Props) {
  const [data, setData] = useState<RankData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/session/rank?gameId=${gameId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gameId]);

  if (loading) {
    return (
      <div className="px-6 py-8 border-t border-white/10 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-white/5 rounded mx-auto" />
        <div className="h-12 w-64 bg-white/5 rounded mx-auto" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 py-8 border-t border-white/10 space-y-6"
    >
      <div className="text-center space-y-1">
        <h3 className="text-sm font-mono tracking-widest text-muted-foreground uppercase">
          Daily Standing
        </h3>
        <p className="text-2xl font-display font-black tracking-widest uppercase text-white italic">
          #{data.rank.toLocaleString()} <span className="text-white/40">/ {data.totalPlayers.toLocaleString()}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-1">
          <Users className="w-5 h-5 text-primary mb-1" />
          <span className="text-[10px] font-mono tracking-tighter text-muted-foreground uppercase">
            Global Drivers
          </span>
          <span className="text-lg font-black font-display italic">
            {data.totalPlayers.toLocaleString()}
          </span>
        </div>
        <div className="glass-panel bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-1">
          <TrendingUp className="w-5 h-5 text-green-400 mb-1" />
          <span className="text-[10px] font-mono tracking-tighter text-muted-foreground uppercase">
            Top %
          </span>
          <span className="text-lg font-black font-display italic">
            {100 - data.percentile}%
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          You placed in the top <span className="text-white font-bold">{100 - data.percentile}%</span> of all drivers today!
        </p>
      </div>
    </motion.div>
  );
}
