// src/features/organization/components/OrgLeadershipForm.jsx
import { UserRoundCog, Info } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormSelectField from "@/shared/components/forms/FormSelectField";
import { useEmployeeOptions } from "../hooks/useEmployeeOptions";

/**
 * مدیر و معاونِ یک واحد یا تیم — مشترک بین هر دو، چون قاعده‌شان یکی است.
 *
 * ⚠️ «معاون» هنوز در بکند وجود ندارد: نه `Department.DeputyId` و نه
 * `Team.DeputyId`. فیلد اینجا کامل ساخته شده ولی **غیرفعال** است و در
 * payloadِ سرور هم نمی‌رود.
 *
 * چرا غیرفعال و نه پنهان: اگر فیلد را حذف می‌کردیم، روزی که بکند ستون را
 * اضافه کند باید فرم دوباره طراحی شود. اگر فعال می‌گذاشتیم، کاربر معاون
 * انتخاب می‌کرد، «ذخیره» می‌زد و سرور بی‌صدا دورش می‌ریخت — یعنی UI
 * دروغ می‌گفت. غیرفعال با توضیح، تنها حالتی است که هم شکل نهایی را
 * نشان می‌دهد و هم توقع غلط نمی‌سازد.
 */
export default function OrgLeadershipForm({ control, scopeLabel = "واحد" }) {
  const { options, isLoading } = useEmployeeOptions();

  return (
    <FormSectionCard icon={UserRoundCog} title={`مدیریت ${scopeLabel}`}>
      <div className="space-y-4">
        <FormSelectField
          name="headId"
          control={control}
          label={`مدیر ${scopeLabel}`}
          options={options}
          isLoading={isLoading}
          placeholder="انتخاب مدیر"
          emptyLabel={`بدون مدیر`}
          emptyValue={null}
        />

        <div className="opacity-60">
          <FormSelectField
            name="deputyId"
            control={control}
            label={`معاون ${scopeLabel}`}
            options={options}
            disabled
            placeholder="در انتظار پیاده‌سازی بکند"
            emptyLabel="بدون معاون"
            emptyValue={null}
          />
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <p className="text-xs leading-5 text-amber-800 dark:text-amber-300">
            فیلد «معاون» تا زمانی که بکند ستون <code>DeputyId</code> را به
            جدول‌های واحد و تیم اضافه کند غیرفعال است و ذخیره نمی‌شود.
          </p>
        </div>
      </div>
    </FormSectionCard>
  );
}
