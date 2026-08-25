// src/features/organization/components/PermissionAssignmentForm.jsx
import { Controller } from "react-hook-form";
import { ShieldCheck } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import {
  PERMISSION_GROUPS,
  ALL_PERMISSION_IDS,
} from "@/shared/domain/permissions/permissionCatalog";

/** یک ستون از ماتریس: چک‌باکس‌های گروه‌بندی‌شده + دو دکمه‌ی «همه/هیچ‌کدام». */
function PermissionColumn({ title, hint, name, control }) {
  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>

      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const selected = new Set(field.value ?? []);
          const toggle = (id) => {
            const next = new Set(selected);
            next.has(id) ? next.delete(id) : next.add(id);
            field.onChange([...next]);
          };

          return (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => field.onChange([...ALL_PERMISSION_IDS])}
                >
                  انتخاب همه
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => field.onChange([])}
                >
                  پاک‌کردن همه
                </Button>
              </div>

              <div className="space-y-3 max-h-80 overflow-auto custom-scroll rounded-lg border border-border p-3">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.groupId} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.items.map((item) => {
                        const checkboxId = `${name}-${item.id}`;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={selected.has(item.id)}
                              onCheckedChange={() => toggle(item.id)}
                            />
                            <Label
                              htmlFor={checkboxId}
                              className="text-xs font-normal cursor-pointer leading-5"
                            >
                              {item.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

/**
 * تخصیصِ دسترسی به یک واحد سازمانی — دو سطح، چون دسترسی «بر اساس واحد
 * کاری و جایگاهِ فرد در آن واحد» است:
 *
 *   اعضا          → پایه‌ترین دسترسیِ لازم برای کار روزمره در این واحد
 *   مدیر و معاون   → همان‌ها به‌علاوه‌ی چیزهایی که فقط مسئولِ واحد باید ببیند
 *
 * دسترسیِ نهاییِ هر کارمند از ترکیب این دو با جایگاهش محاسبه می‌شود
 * (`shared/domain/permissions/effectivePermissions.js`) — نه از یک فیلد
 * جدا روی خودِ کارمند.
 */
export default function PermissionAssignmentForm({ control }) {
  return (
    <FormSectionCard icon={ShieldCheck} title="دسترسی‌های این واحد">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PermissionColumn
          title="دسترسی اعضا"
          hint="همه‌ی کارمندان این واحد این دسترسی‌ها را دارند."
          name="memberPermissionIds"
          control={control}
        />
        <PermissionColumn
          title="دسترسی مدیر و معاون"
          hint="علاوه بر دسترسی اعضا، فقط برای مدیر و معاون این واحد."
          name="managerPermissionIds"
          control={control}
        />
      </div>
    </FormSectionCard>
  );
}
