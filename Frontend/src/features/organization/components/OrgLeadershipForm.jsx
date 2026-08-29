// src/features/organization/components/OrgLeadershipForm.jsx
import { useMemo } from "react";
import { useWatch } from "react-hook-form";
import { UserRoundCog } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormSelectField from "@/shared/components/forms/FormSelectField";
import { useEmployeeOptions } from "../hooks/useEmployeeOptions";

/**
 * مدیر و معاونِ یک واحد یا تیم — مشترک بین هر دو، چون قاعده‌شان یکی است.
 *
 * معاون **اختیاری ولی اجباریِ ارسال** است: `UpdateDepartmentCommand` و
 * `UpdateTeamCommand` هر دو بی‌قید `DeputyId = request.DeputyId` را ست
 * می‌کنند. یعنی اگر فرم این فیلد را نفرستد، هر بار ذخیره‌کردنِ نام یا
 * مدیر، معاونِ ثبت‌شده را **پاک می‌کند**. برای همین حتی اگر کاربر به
 * معاون کاری نداشته باشد، مقدارِ فعلی باید در فرم بنشیند و برگردد.
 *
 * قاعده‌ی «معاون نمی‌تواند همان مدیر باشد» را سرور هم اعتبارسنجی می‌کند؛
 * اینجا فقط زودتر و با پیام فارسیِ یکسان گرفته می‌شود.
 */
export default function OrgLeadershipForm({
  control,
  errors,
  scopeLabel = "واحد",
}) {
  const { options, isLoading } = useEmployeeOptions();

  const headId = useWatch({ control, name: "headId" });

  const deputyRules = useMemo(
    () => ({
      validate: (value) =>
        value == null || value !== headId || "معاون نمی‌تواند همان مدیر باشد",
    }),
    [headId],
  );

  return (
    <FormSectionCard icon={UserRoundCog} title={`مدیریت ${scopeLabel}`}>
      <div className="space-y-5">
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

        <FormSelectField
          name="deputyId"
          control={control}
          label={`معاون ${scopeLabel}`}
          options={options}
          isLoading={isLoading}
          placeholder="انتخاب معاون"
          emptyLabel="بدون معاون"
          emptyValue={null}
          rules={deputyRules}
          error={errors?.deputyId}
        />
      </div>
    </FormSectionCard>
  );
}
