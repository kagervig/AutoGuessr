"use client";

import { useEffect, useState } from "react";
import Combobox from "./Combobox";

interface Props {
  makes: string[];
  disabled: boolean;
  onSubmit: (make: string, model: string, year: string) => void;
}

export default function StandardModeInput({ makes, disabled, onSubmit }: Props) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [modelData, setModelData] = useState<{ make: string; models: string[] } | null>(null);
  // Derived: loading whenever we have a make but no data for it yet
  const loading = !!make && modelData?.make !== make;
  const models = modelData?.make === make ? modelData.models : [];

  const handleMakeChange = (newMake: string) => {
    setMake(newMake);
    setModel("");
  };

  useEffect(() => {
    if (!make) return;
    fetch(`/api/models?make=${encodeURIComponent(make)}`)
      .then((r) => r.json())
      .then((data) => setModelData({ make, models: data.models ?? [] }))
      .catch(() => setModelData({ make, models: [] }));
  }, [make]);

  const canSubmit = !!make && !!model && !!year;

  return (
    <div className="space-y-3">
      <Combobox
        value={make}
        onChange={handleMakeChange}
        options={makes}
        placeholder="Make (e.g. Ferrari)"
        disabled={disabled}
      />
      <Combobox
        value={model}
        onChange={setModel}
        options={models}
        placeholder={make ? (loading ? "Loading…" : "Model") : "Select make first"}
        disabled={disabled || !make || loading}
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
