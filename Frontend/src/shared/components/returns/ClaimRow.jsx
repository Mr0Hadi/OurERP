import { Trash2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/**
 * یک ردیف ادعا: چه مشکلی، چند تا، و توضیح.
 */
export default function ClaimRow({
  claim,
  onUpdate,
  onRemove,
  // اگر فراخوان برچسب‌ها را نفرستد، یک dropdown خالی خیلی بهتر از
  // پاشیدنِ کل صفحه است — که دقیقاً همان اتفاقی بود که با
  // Object.entries(undefined) می‌افتاد.
  problemLabels = {},
  showPrice = false,
}) {
  const problemOptions = Object.entries(problemLabels);
  return (
    <div className="rounded-md border border-border bg-card p-1.5 space-y-1.5">
      {/* موبایل: شبکه‌ی ۶ستونه — مشکل و تعداد در یک سطر، قیمت در سطرِ خودش،
          توضیح و حذف در سطرِ آخر؛ از sm به بالا همه در یک سطر. */}
      <div className="grid grid-cols-6 gap-1.5 sm:flex sm:items-center">
        {/* problem یک enum عددی است ولی Radix همیشه رشته می‌دهد و
            می‌گیرد — پس در همین مرز تبدیل می‌شود. */}
        <Select
          value={claim.problem == null ? "" : String(claim.problem)}
          onValueChange={(v) => onUpdate(claim.id, "problem", Number(v))}
        >
          <SelectTrigger
            aria-label="نوع مشکل"
            className="col-span-4 h-8 w-full text-xs sm:w-52 shrink-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {problemOptions.map(([value, label]) => (
              <SelectItem key={value} value={String(value)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          min={0}
          value={claim.quantity}
          onChange={(e) => onUpdate(claim.id, "quantity", e.target.value)}
          aria-label="تعداد"
          placeholder="تعداد"
          className="col-span-2 h-8 text-center text-xs sm:w-16 shrink-0"
        />

        {showPrice && (
          <Input
            type="number"
            dir="ltr"
            min={0}
            value={claim.unitPrice}
            onChange={(e) => onUpdate(claim.id, "unitPrice", e.target.value)}
            placeholder="قیمت واحد (ریال)"
            aria-label="قیمت واحد"
            className="col-span-6 h-8 text-xs sm:w-32 shrink-0"
          />
        )}

        <Input
          placeholder="توضیح اختیاری..."
          value={claim.note || ""}
          onChange={(e) => onUpdate(claim.id, "note", e.target.value)}
          className="col-span-5 h-8 text-xs sm:flex-1"
        />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="حذف"
          className="col-span-1 h-8 w-full sm:w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRemove(claim.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
