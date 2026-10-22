import { Label } from "@/shared/components/ui/label";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";

export default function FilterDateInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <Label className="whitespace-nowrap font-medium text-foreground text-sm">
        {label}
      </Label>
      <PersianDatePicker value={value} onChange={onChange} className="flex-1" />
    </div>
  );
}
