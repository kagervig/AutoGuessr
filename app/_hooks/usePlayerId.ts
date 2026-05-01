"use client";

import { useEffect, useState } from "react";

const PLAYER_ID_KEY = "ag_player_id";

export function usePlayerId() {
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    setPlayerId(id);
  }, []);

  return playerId;
}
