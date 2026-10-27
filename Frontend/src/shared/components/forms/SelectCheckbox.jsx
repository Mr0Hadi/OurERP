import { Checkbox } from "@/shared/components/ui/checkbox";

/**
 * چک‌باکسِ انتخابِ یک ردیف در فهرست‌ها (دانه‌ها، پیشنهادِ خرید) — همان `Checkbox`ِ برنامه، با ناحیه‌ی لمسِ
 * بزرگ‌تر از خودِ جعبه چون روی تبلت و با دست زده می‌شود. `indeterminate` برای «بخشی انتخاب شده».
 *
 * @param {boolean} checked
 * @param {() => void} onChange
 * @param {string} label برچسبِ دسترس‌پذیری
 * @param {boolean} [indeterminate]
 */
export default function SelectCheckbox({ checked, onChange, label, indeterminate = false }) {
  return (
    <label className="flex size-9 shrink-0 cursor-pointer items-center justify-center">
      <Checkbox
        checked={indeterminate ? "indeterminate" : checked}
        onCheckedChange={() => onChange()}
        aria-label={label}
        className="size-[18px]"
      />
    </label>
  );
}
