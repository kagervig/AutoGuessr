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
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-amber-500 disabled:opacity-50"
      />
      <button
        disabled={disabled || !canSubmit}
        onClick={() => onSubmit(make, model, year)}
        className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-zinc-900 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Submit
      </button>
    </div>
  );
}
