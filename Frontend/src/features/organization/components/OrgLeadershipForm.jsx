// src/features/organization/components/OrgLeadershipForm.jsx
import { UserRoundCog } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormSelectField from "@/shared/components/forms/FormSelectField";
import { useEmployeeOptions } from "../hooks/useEmployeeOptions";

/**
 * مدیرِ یک واحد یا تیم — مشترک بین هر دو، چون قاعده‌شان یکی است.
 *
 * فقط «مدیر» است، نه «معاون»: بکند `HeadId` را روی `Department` و `Team`
 * دارد ولی هیچ ستونی برای معاون ندارد. تا وقتی این ستون در بکند اضافه
 * نشده، فیلدی برایش نمی‌سازیم — ساختنش و غیرفعال‌گذاشتنش یعنی UI شکلی
 * را نشان بدهد که هنوز قرارداد سرور نیست.
 */
export default function OrgLeadershipForm({ control, scopeLabel = "واحد" }) {
  const { options, isLoading } = useEmployeeOptions();

  return (
    <FormSectionCard icon={UserRoundCog} title={`مدیریت ${scopeLabel}`}>
      <FormSelectField
        name="headId"
        control={control}
        label={`مدیر ${scopeLabel}`}
        options={options}
        isLoading={isLoading}
        placeholder="انتخاب مدیر"
        emptyLabel="بدون مدیر"
        emptyValue={null}
      />
    </FormSectionCard>
  );
}
