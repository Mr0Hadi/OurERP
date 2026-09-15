import { useMemo } from "react";
import { useWatch } from "react-hook-form";
import { UserRoundCog } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormSelectField from "@/shared/components/forms/FormSelectField";
import { useEmployeeOptions } from "../hooks/useEmployeeOptions";

/** قاعده‌ی سرور برای هر دامنه — `IOrgRoleService.AssignAsync`. */
const RULE_HINTS = {
  واحد:
    "هر کسی به‌عنوان مسئول یا جانشین انتخاب شود، به این واحد منتقل و از تیمش خارج می‌شود (مسئول و جانشینِ واحد عضو هیچ تیمی نیستند) و نقشِ قبلی‌اش آزاد می‌شود. کسی که از این نقش برداشته شود، عضو ساده‌ی همین واحد می‌ماند.",
  تیم: "هر کسی به‌عنوان مسئول یا جانشین انتخاب شود، به این تیم (و واحدش) منتقل می‌شود و نقشِ قبلی‌اش هر جا که باشد آزاد می‌شود. کسی که از این نقش برداشته شود، عضو ساده‌ی همین تیم می‌ماند.",
};

/**
 * مسئول و جانشینِ یک واحد یا تیم — مشترک بین هر دو، چون قاعده‌شان یکی است.
 *
 * `headId`/`deputyId` **وضعیتِ نهایی** هستند، هم در ثبت و هم در ویرایش:
 * سرور هر کسی را که نامش بیاید منتقل و نقش‌دار می‌کند، و هر کسی که حذف
 * شود را عضوِ ساده باقی می‌گذارد. پس:
 *
 *   - هر کارمندی (از هر واحدی) قابل انتخاب است؛
 *   - `deputyId` همیشه فرستاده می‌شود — نفرستادنش جانشین را برمی‌داشت؛
 *   - «جانشین نمی‌تواند همان مسئول باشد» را سرور هم رد می‌کند.
 */
export default function OrgLeadershipForm({
  control,
  errors,
  scopeLabel = "واحد",
}) {
  const headId = useWatch({ control, name: "headId" });
  const deputyId = useWatch({ control, name: "deputyId" });

  const { options, isLoading } = useEmployeeOptions({
    keepIds: [headId, deputyId],
  });

  const deputyRules = useMemo(
    () => ({
      validate: (value) =>
        value == null || value != headId || "جانشین نمی‌تواند همان مسئول باشد",
    }),
    [headId],
  );

  return (
    <FormSectionCard icon={UserRoundCog} title={`مسئولیت ${scopeLabel}`}>
      <div className="space-y-5">
        <FormSelectField
          name="headId"
          control={control}
          label={`مسئول ${scopeLabel}`}
          options={options}
          isLoading={isLoading}
          placeholder="انتخاب مسئول"
          emptyLabel="بدون مسئول"
          emptyValue={null}
          error={errors?.headId}
        />

        <FormSelectField
          name="deputyId"
          control={control}
          label={`جانشین ${scopeLabel}`}
          options={options}
          isLoading={isLoading}
          placeholder="انتخاب جانشین"
          emptyLabel="بدون جانشین"
          emptyValue={null}
          rules={deputyRules}
          error={errors?.deputyId}
        />

        <p className="text-xs text-muted-foreground leading-5">
          {RULE_HINTS[scopeLabel] ?? RULE_HINTS.واحد}
        </p>
      </div>
    </FormSectionCard>
  );
}
