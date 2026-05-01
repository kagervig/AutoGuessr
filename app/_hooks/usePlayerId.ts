"use client";

import { useState } from "react";

const PLAYER_ID_KEY = "ag_player_id";

export function usePlayerId() {
  const [playerId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  });

  return playerId;
}
