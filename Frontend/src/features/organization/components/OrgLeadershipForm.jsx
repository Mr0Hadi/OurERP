import { useEffect, useMemo, useRef } from "react";
import { useWatch } from "react-hook-form";
import { UserRoundCog } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormSelectField from "@/shared/components/forms/FormSelectField";
import { useEmployeeOptions } from "../hooks/useEmployeeOptions";

/**
 * مدیر و معاونِ یک واحد یا تیم — مشترک بین هر دو، چون قاعده‌شان یکی است.
 *
 * سه قاعده‌ی سرور که این فرم باید پیش از ارسال رعایت کند:
 *
 *   ۱. مدیر و معاون باید **عضو همان واحد** باشند (`head.DepartmentId`).
 *      پس گزینه‌ها فقط کارمندانِ `departmentId` هستند؛ بدون واحد، انتخابگر
 *      غیرفعال است.
 *   ۲. معاون نمی‌تواند همان مدیر باشد.
 *   ۳. معاون **اختیاری ولی اجباریِ ارسال** است: `UpdateDepartmentCommand`
 *      و `UpdateTeamCommand` بی‌قید `DeputyId = request.DeputyId` را ست
 *      می‌کنند، پس مقدارِ فعلی همیشه باید در فرم بنشیند و برگردد.
 *
 * انتصاب در سرور با `ReleaseAllRolesAsync` همراه است: فردِ انتخاب‌شده
 * هر سمتِ مدیریت یا معاونتی را که در تیم یا واحد دیگری دارد از دست
 * می‌دهد. متنِ راهنما همین را می‌گوید.
 *
 * @param departmentId واحدی که مدیر و معاون باید از میان کارمندانش باشند
 * @param setValue اگر داده شود، با عوض‌شدنِ `departmentId` مدیر و معاون
 *        پاک می‌شوند (فرم‌هایی که واحدشان قابل‌تغییر است)
 */
export default function OrgLeadershipForm({
  control,
  errors,
  setValue,
  departmentId,
  scopeLabel = "واحد",
}) {
  const headId = useWatch({ control, name: "headId" });
  const deputyId = useWatch({ control, name: "deputyId" });

  const hasDepartment = departmentId != null && departmentId !== "";

  const { options, isLoading } = useEmployeeOptions(
    hasDepartment ? departmentId : null,
    { keepIds: [headId, deputyId] },
  );

  // فقط *تغییرِ* واحد پاک می‌کند، نه مقداردهیِ اولیه — وگرنه در حالت
  // ویرایش مدیرِ درست پاک می‌شد.
  const previousDepartment = useRef(departmentId);
  useEffect(() => {
    if (!setValue) return;
    if (previousDepartment.current == departmentId) return;
    previousDepartment.current = departmentId;
    setValue("headId", null);
    setValue("deputyId", null);
  }, [departmentId, setValue]);

  const outsiderIds = useMemo(
    () => new Set(options.filter((o) => o.outsider).map((o) => o.value)),
    [options],
  );

  const outsiderMessage = `این فرد عضو این ${
    scopeLabel === "تیم" ? "واحدِ تیم" : "واحد"
  } نیست؛ فرد دیگری انتخاب کنید یا خالی بگذارید`;

  const headRules = useMemo(
    () => ({
      validate: (value) =>
        value == null || !outsiderIds.has(value) || outsiderMessage,
    }),
    [outsiderIds, outsiderMessage],
  );

  const deputyRules = useMemo(
    () => ({
      validate: (value) => {
        if (value == null) return true;
        if (value == headId) return "معاون نمی‌تواند همان مدیر باشد";
        return !outsiderIds.has(value) || outsiderMessage;
      },
    }),
    [headId, outsiderIds, outsiderMessage],
  );

  const placeholder = (text) =>
    hasDepartment ? text : "اول واحد را انتخاب کنید";

  return (
    <FormSectionCard icon={UserRoundCog} title={`مدیریت ${scopeLabel}`}>
      <div className="space-y-5">
        <FormSelectField
          name="headId"
          control={control}
          label={`مدیر ${scopeLabel}`}
          options={options}
          isLoading={isLoading}
          disabled={!hasDepartment}
          placeholder={placeholder("انتخاب مدیر")}
          emptyLabel="بدون مدیر"
          emptyValue={null}
          rules={headRules}
          error={errors?.headId}
        />

        <FormSelectField
          name="deputyId"
          control={control}
          label={`معاون ${scopeLabel}`}
          options={options}
          isLoading={isLoading}
          disabled={!hasDepartment}
          placeholder={placeholder("انتخاب معاون")}
          emptyLabel="بدون معاون"
          emptyValue={null}
          rules={deputyRules}
          error={errors?.deputyId}
        />

        <p className="text-xs text-muted-foreground leading-5">
          فقط کارمندانِ همین واحد قابل انتخاب‌اند. فردی که به‌عنوان مدیر یا
          معاون انتخاب شود، سمتِ قبلی‌اش در هر تیم یا واحدِ دیگری آزاد می‌شود.
        </p>
      </div>
    </FormSectionCard>
  );
}
