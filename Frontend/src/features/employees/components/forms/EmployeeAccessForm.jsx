import { Controller } from "react-hook-form";
import { ShieldCheck } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";

/**
 * وضعیت حساب کاربری.
 *
 * نقشِ سازمانی (`OrgRoleEnum`) اینجا نیست، کنارِ واحد و تیم در
 * `EmployeeOrgForm` است — چون به همان جایگاه وابسته است، نه به حساب.
 *
 * `UpdateUser` با `isActive: false` همه‌ی نقش‌های مسئول/جانشینِ کاربر را
 * هم آزاد می‌کند؛ متنِ راهنما همین را می‌گوید.
 *
 * `isActive` فقط در حالت ویرایش نمایش داده می‌شود چون دستور `CreateUser`
 * آن را نمی‌گیرد — کارمند تازه‌ثبت‌شده همیشه فعال است.
 */
/**
 * این چک‌باکس **تنها** راهِ غیرفعال‌کردن (و دوباره فعال‌کردنِ) کارمند است.
 * دکمه‌ی «حذف کارمند» حذف شد: `DeleteUser` در بکند هم فقط `isActive` را
 * false می‌کند و نقش‌ها را آزاد می‌کند — همان اثرِ این چک‌باکس، ولی
 * بی‌راهِ برگشت.
 *
 * @param readOnly کاربر روی حسابِ *خودش*: برداشتنِ تیک و «ذخیره تغییرات»
 *        یعنی کاربر خودش را بیرونِ سیستم قفل کند.
 */
export default function EmployeeAccessForm({
  control,
  isEditing,
  readOnly = false,
}) {
  if (!isEditing) return null;

  return (
    <FormSectionCard icon={ShieldCheck} title="وضعیت حساب کاربری">
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="flex items-start gap-3">
              <Checkbox
                id="isActive"
                checked={Boolean(field.value)}
                disabled={readOnly}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="isActive"
                  className="text-sm font-medium cursor-pointer"
                >
                  حساب کاربری فعال است
                </Label>
                <p className="text-xs text-muted-foreground leading-5">
                  با غیرفعال‌کردن، کارمند دیگر نمی‌تواند وارد سیستم شود و اگر
                  مسئول یا جانشینِ تیم یا واحدی باشد آن نقش آزاد می‌شود؛ اسناد
                  ثبت‌شده‌اش دست‌نخورده باقی می‌ماند.
                </p>
              </div>
            </div>
          )}
        />
      </div>
    </FormSectionCard>
  );
}
