import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { normalizeFilterValue } from "./filterUtils";

export default function FilterSelect({
  label,
  value,
  onChange,
  allLabel = "همه",
  options,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <Label className="whitespace-nowrap font-medium text-foreground text-sm">
        {label}
      </Label>
      <Select
        value={value || "all"}
        onValueChange={(v) => onChange(normalizeFilterValue(v))}
      >
        <SelectTrigger className="flex-1 w-full">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
