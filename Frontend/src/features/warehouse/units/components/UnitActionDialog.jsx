import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import {
  UNIT_ACTION_META,
  UNIT_ACTION_REASON_LABELS,
  REASONS_BY_ACTION,
  canApply,
  BIN_LOCATION_MAX_LENGTH,
  UNIT_LOCATION_ACTION,
  UnitActionEnum,
  canLocate,
  isUnpaidQuarantine,
  noteRequired,
} from "../domain/unitVocabulary";
import { formatNumber } from "@/shared/lib/numberFormat";
import { useApplyUnitActionMutation, useSetUnitLocationMutation } from "../services/mutations";
import Notice from "@/shared/components/feedback/Notice";
import { productUnitKeys } from "../services/queryKeys";

/** چرا بخشی از انتخاب کنار گذاشته شد — به زبانِ کاری، نه «مجاز نیست». */
function skippedReason(units) {
  return `${formatNumber(units.length)} دانه در وضعیتی است که این کار رویش معنا ندارد`;
}

function ActionForm({ action, units, onDone, onCancel }) {
  const meta = UNIT_ACTION_META[action];
  const reasons = REASONS_BY_ACTION[action];
  const eligible = units.filter((unit) => canApply(unit, action));
  const skipped = units.filter((unit) => !canApply(unit, action));
  const unpaid = action === UnitActionEnum.QUARANTINE ? 0 : eligible.filter(isUnpaidQuarantine).length;

  const [reason, setReason] = useState(reasons[0]);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const mutation = useApplyUnitActionMutation();

  const needsNote = noteRequired(action, reason, eligible);
  const noteMissing = needsNote && !note.trim();

  const submit = (event) => {
    event.preventDefault();
    if (noteMissing) {
      setShowErrors(true);
      return;
    }
    mutation.mutate(
      { action, productUnitIds: eligible.map((unit) => unit.id), reason, note },
      { onSuccess: () => onDone(eligible) },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {meta.label} — {formatNumber(eligible.length)} دانه
        </DialogTitle>
        <DialogDescription>{meta.description}</DialogDescription>
      </DialogHeader>

      {skipped.length > 0 && (
        <Notice tone="warning">{skippedReason(skipped)}. این‌ها دست نمی‌خورند.</Notice>
      )}

      {unpaid > 0 && (
        <Notice tone="warning">
          {formatNumber(unpaid)} دانه مازاد یا کالای خارج از سند است که پولش پرداخت نشده و بدونِ پرداخت
          {action === UnitActionEnum.RELEASE ? " وارد موجودی" : " اسقاط"} می‌شود. اگر تامین‌کننده پولش را
          می‌خواهد، اول از صفحه‌ی مرجوعیِ همان خرید «قبولِ مازاد» را ثبت کنید.
        </Notice>
      )}

      {eligible.length > 0 && eligible.length <= 6 && (
        <ul className="space-y-1 rounded-lg border border-border p-2 text-xs">
          {eligible.map((unit) => (
            <li key={unit.id} className="flex justify-between gap-2">
              <span className="truncate">{unit.productName}</span>
              <span className="font-mono" dir="ltr">
                {unit.barcode}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5">
        <Label>علت</Label>
        <Select value={String(reason)} onValueChange={(value) => setReason(Number(value))}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {reasons.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {UNIT_ACTION_REASON_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>توضیح {needsNote ? "" : "(اختیاری)"}</Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثلاً: قاب ترک خورده، هنگام چیدمان از قفسه افتاد"
          aria-invalid={showErrors && noteMissing}
          rows={3}
        />
        {showErrors && noteMissing && (
          <p className="text-xs text-destructive">
            برای این کار توضیح لازم است؛ در تاریخچه‌ی دانه می‌ماند.
          </p>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          انصراف
        </Button>
        <Button
          type="submit"
          variant={meta.tone === "destructive" ? "destructive" : "default"}
          disabled={eligible.length === 0 || mutation.isPending}
        >
          {mutation.isPending ? "در حال ثبت..." : `${formatNumber(eligible.length)} دانه ${meta.verb}`}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * قفسه‌ی دانه‌ها. پیش‌فرض، قفسه‌ی مشترکِ همه‌ی دانه‌هاست (اگر یکی باشد)؛
 * خالی‌گذاشتن قفسه را پاک می‌کند.
 */
function LocationForm({ units, onDone, onCancel }) {
  const eligible = units.filter(canLocate);
  const skipped = units.length - eligible.length;
  const current = [...new Set(eligible.map((unit) => unit.binLocation || ""))];
  const [binLocation, setBinLocation] = useState(current.length === 1 ? current[0] : "");
  const mutation = useSetUnitLocationMutation();

  const submit = (event) => {
    event.preventDefault();
    mutation.mutate(
      { productUnitIds: eligible.map((unit) => unit.id), binLocation },
      { onSuccess: () => onDone(eligible) },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>تعیین قفسه — {formatNumber(eligible.length)} دانه</DialogTitle>
        <DialogDescription>
          جای فیزیکیِ دانه در انبار، مثلاً «<bdi dir="ltr">A-03-2</bdi>». فقط جایگاه ثبت می‌شود و وضعیت یا موجودی عوض
          نمی‌شود؛ وقتی دانه از انبار برود قفسه‌اش خودکار پاک می‌شود.
        </DialogDescription>
      </DialogHeader>

      {skipped > 0 && (
        <Notice tone="warning">
          {formatNumber(skipped)} دانه دیگر در انبار نیست و قفسه نمی‌گیرد. این‌ها دست نمی‌خورند.
        </Notice>
      )}

      <div className="space-y-1.5">
        <Label>قفسه</Label>
        <Input
          value={binLocation}
          onChange={(e) => setBinLocation(e.target.value)}
          maxLength={BIN_LOCATION_MAX_LENGTH}
          placeholder="مثلاً A-03-2 — خالی یعنی پاک‌کردن قفسه"
          dir="ltr"
          className="font-mono"
          autoFocus
        />
        {current.length > 1 && (
          <p className="text-xs text-muted-foreground">
            دانه‌های انتخاب‌شده الان در {formatNumber(current.length)} قفسه‌ی مختلف‌اند.
          </p>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          انصراف
        </Button>
        <Button type="submit" disabled={eligible.length === 0 || mutation.isPending}>
          {mutation.isPending ? "در حال ثبت..." : binLocation.trim() ? "ثبت قفسه" : "پاک‌کردن قفسه"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * کارِ دستیِ انبار روی یک یا چند دانه، با علت و توضیح. فقط دانه‌هایی که
 * این کار رویشان مجاز است فرستاده می‌شوند؛ بقیه با دلیل کنار می‌روند.
 *
 * فرم با `key` از نو ساخته می‌شود تا هر بار با علتِ پیش‌فرضِ همان کار و
 * توضیحِ خالی باز شود.
 *
 * وسطِ درخواست با Esc یا کلیک بیرون بسته نمی‌شود (مثلِ `ConfirmDialog`)؛ وگرنه
 * کاربر نمی‌فهمید کار ثبت شد یا نه و دوباره انجامش می‌داد.
 */
export default function UnitActionDialog({ request, onOpenChange, onDone }) {
  const isSaving = useIsMutating({ mutationKey: productUnitKeys.unitWrites() }) > 0;
  return (
    <Dialog
      open={!!request}
      onOpenChange={(open) => {
        if (!open && isSaving) return;
        onOpenChange(open);
      }}
    >
      <DialogContent dir="rtl" className="sm:max-w-lg">
        {request &&
          (request.action === UNIT_LOCATION_ACTION ? (
            <LocationForm
              key={request.units.map((u) => u.id).join(",")}
              units={request.units}
              onDone={onDone}
              onCancel={() => onOpenChange(false)}
            />
          ) : (
            <ActionForm
              key={`${request.action}:${request.units.map((u) => u.id).join(",")}`}
              action={request.action}
              units={request.units}
              onDone={onDone}
              onCancel={() => onOpenChange(false)}
            />
          ))}
      </DialogContent>
    </Dialog>
  );
}
