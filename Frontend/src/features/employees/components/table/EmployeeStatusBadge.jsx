import { CheckCircle2, Ban } from "lucide-react";

import StatusBadge from "@/shared/components/status/StatusBadge";

/**
 * وضعیت حساب کارمند. عمداً enum نیست — سرور فقط یک boolean
 * (`isActive`) دارد و ساختن enum دوحالته برایش، یک لایه‌ی اضافه است.
 */
export default function EmployeeStatusBadge({ isActive }) {
  return isActive ? (
    <StatusBadge tone="success" icon={CheckCircle2}>فعال</StatusBadge>
  ) : (
    <StatusBadge tone="danger" icon={Ban}>غیرفعال</StatusBadge>
  );
}
