import { Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export default function FilterSearchInput({
  label = "جستجو",
  placeholder,
  value,
  onChange,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <Label className="whitespace-nowrap font-medium text-foreground text-sm">
        {label}
      </Label>
      <div className="relative flex-1">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="pr-8"
        />
      </div>
    </div>
  );
}
