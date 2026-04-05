"use client";

import { useEffect, useState } from "react";
import Combobox from "./Combobox";

interface Props {
  makes: string[];
  disabled: boolean;
  onSubmit: (make: string, model: string, year: string) => void;
}

export default function HardModeInput({ makes, disabled, onSubmit }: Props) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    setModel("");
    setModels([]);
    if (!make) return;
    setLoadingModels(true);
    fetch(`/api/models?make=${encodeURIComponent(make)}`)
      .then((r) => r.json())
      .then((data) => setModels(data.models ?? []))
      .finally(() => setLoadingModels(false));
  }, [make]);

  const canSubmit = !!make && !!model && !!year;

  return (
    <div className="space-y-3">
      <Combobox
        value={make}
        onChange={setMake}
        options={makes}
        placeholder="Make (e.g. Ferrari)"
        disabled={disabled}
      />
      <Combobox
        value={model}
        onChange={setModel}
        options={models}
        placeholder={make ? (loadingModels ? "Loading…" : "Model") : "Select make first"}
        disabled={disabled || !make}
      />
      <input
        type="number"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        placeholder="Year (e.g. 1969)"
        min={1885}
        max={new Date().getFullYear() + 1}
        disabled={disabled}
        className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-bold placeholder:text-white/25 focus:outline-none focus:border-primary transition-colors disabled:opacity-40"
      />
      <button
        disabled={disabled || !canSubmit}
        onClick={() => onSubmit(make, model, year)}
        className="w-full py-3 rounded-xl bg-primary text-white font-black tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all"
      >
        Submit
      </button>
    </div>
  );
}
