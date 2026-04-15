// Reusable labelled checkbox for admin edit forms.

interface Props {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function CheckboxField({ label, checked, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded"
      />
      {label}
    </label>
  );
}
