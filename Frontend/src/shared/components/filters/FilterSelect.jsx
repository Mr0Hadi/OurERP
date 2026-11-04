import { Label } from "@/shared/components/ui/label";
import OptionSelect from "@/shared/components/forms/OptionSelect";

/**
 * فیلترِ تک‌انتخابیِ کم‌گزینه با ردیفِ «همه» (= `""`، یعنی فیلتر فرستاده نمی‌شود).
 * برای گزینه‌ی زیاد `EntitySelect`.
 */
export default function FilterSelect({
  label,
  value,
  onChange,
  allLabel = "همه",
  options,
  numeric = false,
  boolean = false,
}) {
  return (
    <div className="flex min-w-0 flex-col sm:flex-row sm:items-center gap-2">
      <Label className="whitespace-nowrap font-medium text-foreground text-sm">
        {label}
      </Label>
      <OptionSelect
        value={value}
        onChange={onChange}
        options={options}
        numeric={numeric}
        boolean={boolean}
        emptyLabel={allLabel}
        className="w-full sm:flex-1"
      />
    </div>
  );
}
