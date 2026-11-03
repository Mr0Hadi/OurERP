import { useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import FormField from "@/shared/components/forms/FormField";
import DialogActions from "@/shared/components/feedback/DialogActions";
import { useCreateWarehouseMutation, useUpdateWarehouseMutation } from "../services/mutations";
import { emptyWarehouseDraft, toApiWarehouse, warehouseDraftErrors, warehouseDraftOf } from "../domain/warehouse";

/** بدنه‌ی فرم — با `key` روی هر بازشدن از نو mount می‌شود تا پیش‌نویسِ قبلی نماند. */
function FormBody({ warehouse, onClose }) {
  const isEdit = Boolean(warehouse);
  const [draft, setDraft] = useState(() => (isEdit ? warehouseDraftOf(warehouse) : emptyWarehouseDraft()));
  const [showErrors, setShowErrors] = useState(false);
  const create = useCreateWarehouseMutation();
  const update = useUpdateWarehouseMutation();
  const isPending = create.isPending || update.isPending;

  const errors = warehouseDraftErrors(draft);
  const errorOf = (field) => (showErrors && errors[field] ? { message: errors[field] } : undefined);
  const patch = (next) => setDraft((current) => ({ ...current, ...next }));
  // پیش‌فرض را نمی‌شود برداشت؛ فقط با پیش‌فرض کردنِ انبارِ دیگری جابه‌جا می‌شود.
  const defaultLocked = isEdit && warehouse.isDefault;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (Object.keys(errors).length > 0) return setShowErrors(true);
    if (isEdit) update.mutate(toApiWarehouse(draft, warehouse.id), { onSuccess: onClose });
    else create.mutate(toApiWarehouse(draft), { onSuccess: onClose });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{isEdit ? `ویرایشِ «${warehouse.name}»` : "انبارِ تازه"}</DialogTitle>
        <DialogDescription>
          هر دانه‌ی کالا همیشه در یک انبار است. موجودیِ کالا جمعِ همه‌ی انبارهاست و سهمِ هر انبار از شمردنِ دانه‌ها می‌آید.
        </DialogDescription>
      </DialogHeader>

      <fieldset disabled={isPending} className="min-w-0 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <FormField label="کد" htmlFor="warehouse-code" required error={errorOf("code")}>
            <Input
              id="warehouse-code"
              dir="ltr"
              value={draft.code}
              onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
              placeholder="B2"
              maxLength={30}
              autoFocus={!isEdit}
              className="font-mono"
            />
          </FormField>
          <FormField label="نام" htmlFor="warehouse-name" required error={errorOf("name")}>
            <Input
              id="warehouse-name"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="مثلاً انبارِ شعبه‌ی ۲"
              maxLength={100}
            />
          </FormField>
        </div>
        <FormField label="نشانی" htmlFor="warehouse-address" error={errorOf("address")}>
          <Textarea
            id="warehouse-address"
            rows={2}
            maxLength={500}
            value={draft.address}
            onChange={(e) => patch({ address: e.target.value })}
          />
        </FormField>
        <FormField label="توضیح" htmlFor="warehouse-description" error={errorOf("description")}>
          <Textarea
            id="warehouse-description"
            rows={2}
            maxLength={500}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </FormField>
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="warehouse-default">انبارِ پیش‌فرض</Label>
            <p className="text-xs text-muted-foreground">
              {defaultLocked
                ? "برای برداشتنِ پیش‌فرض، انبارِ دیگری را پیش‌فرض کنید."
                : "کالای ورودی بی انتخابِ انبار این‌جا می‌آید. پیش‌فرضِ قبلی برداشته می‌شود."}
            </p>
          </div>
          <Switch
            id="warehouse-default"
            checked={draft.isDefault}
            disabled={defaultLocked}
            onCheckedChange={(isDefault) => patch({ isDefault })}
          />
        </div>
      </fieldset>

      <DialogActions onCancel={onClose} isPending={isPending} submitLabel={isEdit ? "ذخیره" : "افزودن"} />
    </form>
  );
}

/**
 * افزودن/ویرایشِ انبار (`CreateWarehouse`/`UpdateWarehouse`، دسترسیِ `WarehouseManage`). تعریفِ انبار با چندانبارِ
 * خاموش هم مجاز است (اطلاعاتِ پایه است).
 *
 * @param warehouse ردیفِ `GetWarehouseList` برای ویرایش؛ خالی = افزودن
 */
export default function WarehouseFormDialog({ open, onOpenChange, warehouse }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {open && <FormBody key={warehouse?.id ?? "new"} warehouse={warehouse} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
