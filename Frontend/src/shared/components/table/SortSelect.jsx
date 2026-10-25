import { ArrowDownUp } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/shared/components/ui/select";

const NO_SORT = "__none__";

/**
 * انتخابِ مرتب‌سازی به‌جای سرتیترهای کلیک‌خورِ جدول (نوارِ بالای کارت‌های موبایل).
 *
 * `MobileRowCards` آن را از ستون‌های جدول می‌سازد؛ فهرست‌هایی که کارتِ خودشان را
 * دارند (دانه‌ها) مستقیم صدایش می‌زنند.
 *
 * @param options  `[{ id, label }]` — ستون‌های قابلِ مرتب‌سازی
 * @param sorting  `{ id, desc }` یا `null` (ترتیبِ پیش‌فرضِ سرور)
 * @param onChange `(sorting | null) => void`
 */
export default function SortSelect({ options, sorting, onChange }) {
  if (options.length === 0) return null;

  const value = sorting ? `${sorting.id}:${sorting.desc ? "desc" : "asc"}` : NO_SORT;

  const handleChange = (next) => {
    if (next === NO_SORT) return onChange(null);
    const [id, dir] = next.split(":");
    onChange({ id, desc: dir === "desc" });
  };

  const currentLabel = sorting
    ? `${options.find((option) => option.id === sorting.id)?.label ?? ""} ${sorting.desc ? "↓" : "↑"}`
    : "پیش‌فرض";

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className="h-8 w-auto min-w-0 max-w-full gap-1.5 rounded-full bg-muted/40 px-3 text-xs"
        aria-label="مرتب‌سازی"
      >
        <ArrowDownUp className="size-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">مرتب‌سازی:</span>
        <span className="truncate font-medium">{currentLabel}</span>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        <SelectItem value={NO_SORT}>پیش‌فرض</SelectItem>
        {options.flatMap(({ id, label }) => [
          <SelectItem key={`${id}:desc`} value={`${id}:desc`}>
            {label} — نزولی
          </SelectItem>,
          <SelectItem key={`${id}:asc`} value={`${id}:asc`}>
            {label} — صعودی
          </SelectItem>,
        ])}
      </SelectContent>
    </Select>
  );
}
