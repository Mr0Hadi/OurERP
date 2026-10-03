import { FileCheck2, FilePenLine } from "lucide-react";

import { Card } from "@/shared/components/ui/card";
import ChoiceCards from "./ChoiceCards";

/**
 * «پیش‌فاکتور یا فاکتور؟» — اولین تصمیمِ فرم، بالای صفحه، چون شکلِ بقیه‌ی
 * فرم را تعیین می‌کند (شماره، تاریخ و پرداخت فقط در فاکتور). قبلاً یک کلیدِ
 * کوچک در ستونِ کناری بود و کاربر نمی‌دید چرا فیلدها غیرفعال‌اند.
 *
 * @param descriptions `{ proforma, invoice }` — یک خطِ توضیح برای هر گزینه
 * @param lockedReason اگر نوع قابل‌انتخاب نیست (مثلاً فروشِ حضوری)، دلیلش
 */
export default function DocumentKindPicker({ value, onChange, descriptions, lockedReason }) {
  const options = [
    {
      value: "proforma",
      label: "پیش‌فاکتور",
      description: descriptions.proforma,
      icon: FilePenLine,
      disabled: Boolean(lockedReason),
    },
    {
      value: "invoice",
      label: "فاکتور",
      description: descriptions.invoice,
      icon: FileCheck2,
      disabled: Boolean(lockedReason),
    },
  ];

  return (
    <Card className="gap-2 p-3">
      <ChoiceCards label="نوع سند" options={options} value={value} onChange={onChange} />
      {lockedReason && <p className="px-1 text-xs text-muted-foreground">{lockedReason}</p>}
    </Card>
  );
}
