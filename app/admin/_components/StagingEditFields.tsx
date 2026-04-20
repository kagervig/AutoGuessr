"use client";

// Shared edit form fields for staging image review panels (vehicle details + image metadata).
// compact=false: vertical list for the sidebar panel.
// compact=true: dense CSS grid for the full-width bottom panel.

import type { Dispatch, SetStateAction } from "react";
import Combobox from "@/app/_components/Combobox";
import { BODY_STYLES, ERAS, RARITIES } from "@/app/lib/constants";
import CheckboxField from "./CheckboxField";
import type { EditForm } from "./staging-types";

type FieldError = Partial<Record<"make" | "model" | "year" | "regionSlug" | "countryOfOrigin", string>>;

interface Props {
  form: EditForm;
  setForm: Dispatch<SetStateAction<EditForm>>;
  makeOptions: string[];
  modelOptions: string[];
  trimOptions: string[];
  countryOptions: string[];
  regionOptions: string[];
  copyrightHolderOptions: string[];
  categoryOptions: { slug: string; label: string }[];
  disabled?: boolean;
  fieldErrors?: FieldError;
  compact?: boolean;
}

export default function StagingEditFields({
  form,
  setForm,
  makeOptions,
  modelOptions,
  trimOptions,
  countryOptions,
  regionOptions,
  copyrightHolderOptions,
  categoryOptions,
  disabled = false,
  fieldErrors = {},
  compact = false,
}: Props) {
  function toggleCategory(slug: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(slug)
        ? f.categories.filter((c) => c !== slug)
        : [...f.categories, slug],
    }));
  }

  const inputClass =
    "w-full text-sm text-black border rounded px-2 py-1.5 focus:outline-none focus:border-gray-400";
  const selectClass = `${inputClass} bg-white`;
  const compactInputClass =
    "w-full text-xs text-black border rounded px-2 py-1 focus:outline-none focus:border-gray-400";
  const compactSelectClass = `${compactInputClass} bg-white`;

  function emptyBorder(value: string) {
    return value ? "border-gray-200" : "border-amber-400 bg-amber-50";
  }

  if (compact) {
    return (
      <div className={`grid grid-cols-12 gap-x-3 gap-y-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
        {/* Row 1: Make / Model / Year / Trim */}
        <div className="col-span-3">
          <label className="block text-xs text-gray-500 mb-0.5">Make{fieldErrors.make && <span className="text-red-500 ml-1">*</span>}</label>
          <Combobox variant="admin" value={form.make} onChange={(v) => setForm((f) => ({ ...f, make: v }))} options={makeOptions} highlight={!form.make} />
        </div>
        <div className="col-span-3">
          <label className="block text-xs text-gray-500 mb-0.5">Model{fieldErrors.model && <span className="text-red-500 ml-1">*</span>}</label>
          <Combobox variant="admin" value={form.model} onChange={(v) => setForm((f) => ({ ...f, model: v }))} options={modelOptions} highlight={!form.model} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-0.5">Year{fieldErrors.year && <span className="text-red-500 ml-1">*</span>}</label>
          <input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} className={`${compactInputClass} ${emptyBorder(form.year)}`} placeholder="1994" />
        </div>
        <div className="col-span-4">
          <label className="block text-xs text-gray-500 mb-0.5">Trim</label>
          <Combobox variant="admin" value={form.trim} onChange={(v) => setForm((f) => ({ ...f, trim: v }))} options={trimOptions} />
        </div>

        {/* Row 2: Body / Era / Rarity / Region / Country */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-0.5">Body</label>
          <select value={form.bodyStyle} onChange={(e) => setForm((f) => ({ ...f, bodyStyle: e.target.value }))} className={compactSelectClass}>
            <option value="">—</option>
            {BODY_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-0.5">Era</label>
          <select value={form.era} onChange={(e) => setForm((f) => ({ ...f, era: e.target.value }))} className={compactSelectClass}>
            <option value="">—</option>
            {ERAS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-0.5">Rarity</label>
          <select value={form.rarity} onChange={(e) => setForm((f) => ({ ...f, rarity: e.target.value }))} className={compactSelectClass}>
            <option value="">—</option>
            {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="col-span-3">
          <label className="block text-xs text-gray-500 mb-0.5">Region{fieldErrors.regionSlug && <span className="text-red-500 ml-1">*</span>}</label>
          <Combobox variant="admin" value={form.regionSlug} onChange={(v) => setForm((f) => ({ ...f, regionSlug: v }))} options={regionOptions} placeholder="e.g. japan" highlight={!form.regionSlug} />
        </div>
        <div className="col-span-3">
          <label className="block text-xs text-gray-500 mb-0.5">Country{fieldErrors.countryOfOrigin && <span className="text-red-500 ml-1">*</span>}</label>
          <Combobox variant="admin" value={form.countryOfOrigin} onChange={(v) => setForm((f) => ({ ...f, countryOfOrigin: v }))} options={countryOptions} placeholder="e.g. Japan" highlight={!form.countryOfOrigin} />
        </div>

        {/* Row 3: Categories */}
        <div className="col-span-12">
          <div className="flex flex-wrap gap-1">
            {categoryOptions.map(({ slug, label }) => (
              <button
                key={slug}
                type="button"
                onClick={() => toggleCategory(slug)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  form.categories.includes(slug)
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 4: Hardcore / Copyright */}
        <div className="col-span-3 flex items-end pb-1">
          <CheckboxField label="Hardcore eligible" checked={form.isHardcoreEligible} onChange={(v) => setForm((f) => ({ ...f, isHardcoreEligible: v }))} />
        </div>
        <div className="col-span-9">
          <label className="block text-xs text-gray-500 mb-0.5">Copyright holder</label>
          <Combobox variant="admin" value={form.copyrightHolder} onChange={(v) => setForm((f) => ({ ...f, copyrightHolder: v }))} options={copyrightHolderOptions} placeholder="e.g. Wikimedia Commons" />
        </div>

        {/* Row 5: Notes */}
        <div className="col-span-12">
          <label className="block text-xs text-gray-500 mb-0.5">Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={1} className={`${compactInputClass} resize-none`} />
        </div>

        {/* Row 6: Image flags */}
        <div className="col-span-12 flex flex-wrap gap-x-4 gap-y-1">
          <CheckboxField label="Cropped" checked={form.isCropped} onChange={(v) => setForm((f) => ({ ...f, isCropped: v }))} />
          <CheckboxField label="Logo visible" checked={form.isLogoVisible} onChange={(v) => setForm((f) => ({ ...f, isLogoVisible: v }))} />
          <CheckboxField label="Model name visible" checked={form.isModelNameVisible} onChange={(v) => setForm((f) => ({ ...f, isModelNameVisible: v }))} />
          <CheckboxField label="Multiple vehicles" checked={form.hasMultipleVehicles} onChange={(v) => setForm((f) => ({ ...f, hasMultipleVehicles: v }))} />
          <CheckboxField label="Face visible" checked={form.isFaceVisible} onChange={(v) => setForm((f) => ({ ...f, isFaceVisible: v }))} />
          <CheckboxField label="Vehicle unmodified" checked={form.isVehicleUnmodified} onChange={(v) => setForm((f) => ({ ...f, isVehicleUnmodified: v }))} />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vehicle details</p>

      <div>
        <label className="block text-xs text-gray-500 mb-0.5">Make</label>
        <Combobox
          variant="admin"
          value={form.make}
          onChange={(v) => setForm((f) => ({ ...f, make: v }))}
          options={makeOptions}
          highlight={!form.make}
        />
        {fieldErrors.make && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.make}</p>}
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-0.5">Model</label>
        <Combobox
          variant="admin"
          value={form.model}
          onChange={(v) => setForm((f) => ({ ...f, model: v }))}
          options={modelOptions}
          highlight={!form.model}
        />
        {fieldErrors.model && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.model}</p>}
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-0.5">Trim</label>
        <Combobox
          variant="admin"
          value={form.trim}
          onChange={(v) => setForm((f) => ({ ...f, trim: v }))}
          options={trimOptions}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-0.5">Year</label>
        <input
          type="number"
          value={form.year}
          onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
          className={`${inputClass} ${emptyBorder(form.year)}`}
          placeholder="e.g. 1994"
        />
        {fieldErrors.year && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.year}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Body style</label>
          <select
            value={form.bodyStyle}
            onChange={(e) => setForm((f) => ({ ...f, bodyStyle: e.target.value }))}
            className={selectClass}
          >
            <option value="">— select —</option>
            {BODY_STYLES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Era</label>
          <select
            value={form.era}
            onChange={(e) => setForm((f) => ({ ...f, era: e.target.value }))}
            className={selectClass}
          >
            <option value="">— select —</option>
            {ERAS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Rarity</label>
          <select
            value={form.rarity}
            onChange={(e) => setForm((f) => ({ ...f, rarity: e.target.value }))}
            className={selectClass}
          >
            <option value="">— select —</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Region slug</label>
          <Combobox
            variant="admin"
            value={form.regionSlug}
            onChange={(v) => setForm((f) => ({ ...f, regionSlug: v }))}
            options={regionOptions}
            placeholder="e.g. japan"
            highlight={!form.regionSlug}
          />
          {fieldErrors.regionSlug && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.regionSlug}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-0.5">Country of origin</label>
        <Combobox
          variant="admin"
          value={form.countryOfOrigin}
          onChange={(v) => setForm((f) => ({ ...f, countryOfOrigin: v }))}
          options={countryOptions}
          placeholder="e.g. Japan"
          highlight={!form.countryOfOrigin}
        />
        {fieldErrors.countryOfOrigin && (
          <p className="text-xs text-red-500 mt-0.5">{fieldErrors.countryOfOrigin}</p>
        )}
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1">Categories</p>
        <div className="flex flex-wrap gap-1.5">
          {categoryOptions.map(({ slug, label }) => (
            <button
              key={slug}
              type="button"
              onClick={() => toggleCategory(slug)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                form.categories.includes(slug)
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <CheckboxField
        label="Hardcore eligible"
        checked={form.isHardcoreEligible}
        onChange={(v) => setForm((f) => ({ ...f, isHardcoreEligible: v }))}
      />

      <div>
        <label className="block text-xs text-gray-500 mb-0.5">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Image metadata
        </p>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Copyright holder</label>
            <Combobox
              variant="admin"
              value={form.copyrightHolder}
              onChange={(v) => setForm((f) => ({ ...f, copyrightHolder: v }))}
              options={copyrightHolderOptions}
              placeholder="e.g. Wikimedia Commons"
            />
          </div>
          <CheckboxField label="Cropped (partial view)" checked={form.isCropped} onChange={(v) => setForm((f) => ({ ...f, isCropped: v }))} />
          <CheckboxField label="Logo visible" checked={form.isLogoVisible} onChange={(v) => setForm((f) => ({ ...f, isLogoVisible: v }))} />
          <CheckboxField label="Model name visible" checked={form.isModelNameVisible} onChange={(v) => setForm((f) => ({ ...f, isModelNameVisible: v }))} />
          <CheckboxField label="Multiple vehicles in image" checked={form.hasMultipleVehicles} onChange={(v) => setForm((f) => ({ ...f, hasMultipleVehicles: v }))} />
          <CheckboxField label="Face visible" checked={form.isFaceVisible} onChange={(v) => setForm((f) => ({ ...f, isFaceVisible: v }))} />
          <CheckboxField label="Vehicle unmodified" checked={form.isVehicleUnmodified} onChange={(v) => setForm((f) => ({ ...f, isVehicleUnmodified: v }))} />
        </div>
      </div>
    </div>
  );
}
