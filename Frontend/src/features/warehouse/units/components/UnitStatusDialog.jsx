// src/features/warehouse/units/components/UnitStatusDialog.jsx
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import {
  MANUAL_UNIT_STATUSES,
  UNIT_STATUSES,
  UNIT_STATUS_LABELS,
} from "../services/mockData";

/**
 * ثبت وضعیت دستی برای یک یا چند واحد.
 *
 * توضیح اجباری است: «چرا از انبار خارج شد» تنها چیزی است که بعداً
 * موقع بررسی مغایرت به کار می‌آید.
 */
export default function UnitStatusDialog({
  open,
  onOpenChange,
  units = [],
  onSubmit,
  isPending,
}) {
  // ورودی‌ها با هر بار باز شدن از نو شروع می‌شوند؛ والد با key
  // کامپوننت را دوباره می‌سازد، پس نیازی به ریست دستی نیست.
  const [status, setStatus] = useState(UNIT_STATUSES.DAMAGED);
  const [note, setNote] = useState("");

  const leavesStock = status !== UNIT_STATUSES.IN_STOCK;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>ثبت وضعیت واحد</DialogTitle>
          <DialogDescription>
            {units.length === 1
              ? units[0]?.unitCode
              : `${units.length} واحد انتخاب شده`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>وضعیت جدید</Label>
            <Select
              value={String(status)}
              onValueChange={(value) => setStatus(Number(value))}
            >
              <SelectTrigger dir="rtl" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {MANUAL_UNIT_STATUSES.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {UNIT_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-status-note">توضیح</Label>
            <Textarea
              id="unit-status-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: هنگام جابه‌جایی افتاد و شکست"
              rows={3}
            />
          </div>

          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            {leavesStock
              ? "با ثبت این وضعیت، موجودی کالا به همان تعداد کم می‌شود."
              : "با برگرداندن واحد به انبار، موجودی کالا به همان تعداد اضافه می‌شود."}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            انصراف
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!note.trim() || isPending}
            onClick={() => onSubmit({ status, note: note.trim() })}
          >
            {isPending ? "در حال ثبت…" : "ثبت وضعیت"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
