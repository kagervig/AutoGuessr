"use client";

// Hook that manages autocomplete options and auto-fill side-effects for staging edit forms.

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { eraFromYear } from "@/app/lib/constants";
import type { EditForm } from "./staging-types";

export interface AutocompleteOptions {
  makeOptions: string[];
  modelOptions: string[];
  trimOptions: string[];
  countryOptions: string[];
  regionOptions: string[];
  copyrightHolderOptions: string[];
  categoryOptions: { slug: string; label: string }[];
}

export function useStagingAutocomplete(
  form: EditForm,
  setForm: Dispatch<SetStateAction<EditForm>>
): AutocompleteOptions {
  const [makeOptions, setMakeOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [trimOptions, setTrimOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [copyrightHolderOptions, setCopyrightHolderOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ slug: string; label: string }[]>([]);
  const [makeDefaults, setMakeDefaults] = useState<Record<string, { country: string; regionSlug: string }>>({});

  // Static options fetched once on mount
  useEffect(() => {
    const safeJson = (r: Response) => r.json().catch(() => null);
    fetch("/api/admin/autocomplete?field=make")
      .then(safeJson).then((d) => d && setMakeOptions(d));
    fetch("/api/admin/autocomplete?field=country")
      .then(safeJson).then((d) => d && setCountryOptions(d));
    fetch("/api/admin/autocomplete?field=make_defaults")
      .then(safeJson).then((d) => d && setMakeDefaults(d));
    fetch("/api/admin/autocomplete?field=copyright_holder")
      .then(safeJson).then((d) => d && setCopyrightHolderOptions(d));
    fetch("/api/filters")
      .then(safeJson)
      .then((d) => d && setRegionOptions((d.regions ?? []).map((r: { slug: string }) => r.slug)));
    fetch("/api/admin/categories")
      .then(safeJson)
      .then((d) => d && setCategoryOptions(d.map((c: { slug: string; label: string }) => ({ slug: c.slug, label: c.label }))));
  }, []);

  // Reload model options when make changes
  useEffect(() => {
    const qs = form.make ? `&make=${encodeURIComponent(form.make)}` : "";
    fetch(`/api/admin/autocomplete?field=model${qs}`)
      .then((r) => r.json().catch(() => null))
      .then((d) => d && setModelOptions(d));
  }, [form.make]);

  // Reload trim options when make or model changes
  useEffect(() => {
    const make = form.make ? `&make=${encodeURIComponent(form.make)}` : "";
    const model = form.model ? `&model=${encodeURIComponent(form.model)}` : "";
    fetch(`/api/admin/autocomplete?field=trim${make}${model}`)
      .then((r) => r.json().catch(() => null))
      .then((d) => d && setTrimOptions(d));
  }, [form.make, form.model]);

  // Auto-fill country and region from make defaults when those fields are empty
  useEffect(() => {
    if (!form.make) return;
    const defaults = makeDefaults[form.make];
    if (!defaults) return;
    setForm((f) => ({
      ...f,
      countryOfOrigin: f.countryOfOrigin || defaults.country,
      regionSlug: f.regionSlug || defaults.regionSlug,
    }));
  }, [form.make, makeDefaults, setForm]);

  // Auto-fill era from year when era is empty
  useEffect(() => {
    const year = parseInt(form.year, 10);
    if (!form.year || isNaN(year)) return;
    setForm((f) => ({ ...f, era: f.era || eraFromYear(year) }));
  }, [form.year, setForm]);

  return {
    makeOptions,
    modelOptions,
    trimOptions,
    countryOptions,
    regionOptions,
    copyrightHolderOptions,
    categoryOptions,
  };
}
