// src/features/employees/components/table/EmployeeStatusBadge.jsx
import { CheckCircle2, Ban } from "lucide-react";

/**
 * وضعیت حساب کارمند. عمداً enum نیست — سرور فقط یک boolean
 * (`isActive`) دارد و ساختن enum دوحالته برایش، یک لایه‌ی اضافه است.
 */
export default function EmployeeStatusBadge({ isActive }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800">
        <CheckCircle2 className="w-3 h-3" />
        فعال
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap bg-destructive/5 text-destructive border-destructive/20">
      <Ban className="w-3 h-3" />
      غیرفعال
    </span>
  );
}
