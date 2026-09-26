import { useEffect, useRef } from "react";

/**
 * چک‌باکسِ انتخابِ دانه. ناحیه‌ی لمسش عمداً بزرگ‌تر از خودِ جعبه است چون
 * روی تبلت و با دست زده می‌شود. `indeterminate` برای «بخشی از این صفحه
 * انتخاب شده».
 */
export default function UnitSelectCheckbox({ checked, onChange, label, indeterminate = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="h-4 w-4 cursor-pointer accent-primary"
      />
    </label>
  );
}
