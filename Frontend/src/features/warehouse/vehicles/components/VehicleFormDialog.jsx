import { useState } from "react";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useCreateVehicleMutation, useUpdateVehicleMutation } from "../services/mutations";
import DialogActions from "@/shared/components/feedback/DialogActions";

/** بدنه‌ی فرم — با `key` روی هر بازشدن از نو mount می‌شود (مثلِ فرمِ دسته‌بندی). */
function VehicleFormFields({ vehicle, onClose, onSaved }) {
  const [name, setName] = useState(vehicle?.name || "");
  const [showError, setShowError] = useState(false);
  const isEdit = Boolean(vehicle);

  const createMutation = useCreateVehicleMutation();
  const updateMutation = useUpdateVehicleMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const trimmed = name.trim();

  const handleSubmit = (event) => {
    event.preventDefault();
    // داخلِ فرمِ کالا هم باز می‌شود؛ submit نباید تا فرمِ کالا بالا برود.
    event.stopPropagation();
    if (!trimmed) {
      setShowError(true);
      return;
    }
    const done = (saved) => {
      onSaved?.(saved);
      onClose();
    };
    if (isEdit) {
      updateMutation.mutate({ id: vehicle.id, name: trimmed }, { onSuccess: done });
    } else {
      createMutation.mutate({ name: trimmed }, { onSuccess: done });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "ویرایش نام خودرو" : "افزودن خودروی جدید"}</DialogTitle>
        <DialogDescription>
          نام تکراری پذیرفته نمی‌شود؛ فاصله‌های اضافه و «ي/ك» عربی خودکار یکدست می‌شوند.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2 py-4">
        <Label htmlFor="vehicleName">نام خودرو</Label>
        <Input
          id="vehicleName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: پراید ۱۱۱"
          maxLength={100}
          aria-invalid={showError && !trimmed}
          autoFocus
        />
        {showError && !trimmed && (
          <p className="text-xs text-destructive">نام خودرو را بنویسید.</p>
        )}
      </div>

      <DialogActions onCancel={onClose} isPending={isPending} submitLabel={isEdit ? "ذخیره" : "افزودن"} />
    </form>
  );
}

/**
 * افزودن/ویرایشِ نامِ یک خودرو — در صفحه‌ی خودروها و کنارِ انتخابگرِ خودرو در
 * فرمِ کالا. `vehicle` یعنی ویرایش؛ `onSaved` خودروی ذخیره‌شده (`{ id, name }`).
 */
export default function VehicleFormDialog({ open, onOpenChange, vehicle, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <VehicleFormFields
          key={vehicle?.id ?? "new"}
          vehicle={vehicle}
          onClose={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}
