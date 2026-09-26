import { useState } from "react";
import { AlertTriangle } from "lucide-react";

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
  isPurchaseQuarantine,
  noteRequired,
  fa,
} from "../domain/unitVocabulary";
import { useApplyUnitActionMutation } from "../services/mutations";

/** چرا بخشی از انتخاب کنار گذاشته شد — به زبانِ کاری، نه «مجاز نیست». */
function skippedReason(units) {
  return `${fa(units.length)} دانه در وضعیتی است که این کار رویش معنا ندارد`;
}

function ActionForm({ action, units, onDone, onCancel }) {
  const meta = UNIT_ACTION_META[action];
  const reasons = REASONS_BY_ACTION[action];
  const eligible = units.filter((unit) => canApply(unit, action));
  const skipped = units.filter((unit) => !canApply(unit, action));
  const purchaseQuarantine = eligible.filter(isPurchaseQuarantine).length;

  const [reason, setReason] = useState(reasons[0]);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const mutation = useApplyUnitActionMutation();

  const needsNote = noteRequired(action, reason);
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
          {meta.label} — {fa(eligible.length)} دانه
        </DialogTitle>
        <DialogDescription>{meta.description}</DialogDescription>
      </DialogHeader>

      {skipped.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {skippedReason(skipped)}. این‌ها دست نمی‌خورند.
        </p>
      )}

      {purchaseQuarantine > 0 && (
        <p className="rounded-lg bg-muted/60 p-2 text-xs leading-5 text-muted-foreground">
          {fa(purchaseQuarantine)} دانه از قرنطینه‌ی دریافتِ خرید است؛ حسابِ خریدِ آن با تامین‌کننده هم
          همراهِ این کار به‌روز می‌شود.
        </p>
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
          {mutation.isPending ? "در حال ثبت..." : `${fa(eligible.length)} دانه ${meta.verb}`}
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
 */
export default function UnitActionDialog({ request, onOpenChange, onDone }) {
  return (
    <Dialog open={!!request} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        {request && (
          <ActionForm
            key={`${request.action}:${request.units.map((u) => u.id).join(",")}`}
            action={request.action}
            units={request.units}
            onDone={onDone}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
