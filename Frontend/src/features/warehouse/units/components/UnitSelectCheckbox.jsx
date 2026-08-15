// src/features/warehouse/units/components/UnitSelectCheckbox.jsx

/**
 * چک‌باکس کوچکِ محلی.
 *
 * shared/ui هنوز primitive چک‌باکس ندارد و اضافه‌کردنش به‌عنوان اثر
 * جانبیِ این تغییر درست نبود؛ انتخاب ردیف تنها جایی است که لازم می‌شود.
 * اندازه‌اش عمداً بزرگ‌تر از حد معمول است چون با دست و روی تبلت زده
 * می‌شود.
 */
export default function UnitSelectCheckbox({ checked, onChange, label }) {
  return (
    <label className="flex h-9 w-9 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="h-4.5 w-4.5 cursor-pointer accent-primary"
      />
    </label>
  );
}
