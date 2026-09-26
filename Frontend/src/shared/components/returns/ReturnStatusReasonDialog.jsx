import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import FormField from "@/shared/components/forms/FormField";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";

/** همان سقفی که سرور روی `reason` چک می‌کند (`ReturnStatusReason.MaxLength`). */
export const RETURN_STATUS_REASON_MAX_LENGTH = 500;

/**
 * تأییدِ رد یا لغوِ مرجوعی، با دلیلِ اختیاری.
 *
 * دلیل روی سند به‌صورت `statusReason` ذخیره می‌شود و کنارِ وضعیت دیده
 * می‌شود؛ خالی‌گذاشتنش مجاز است. دیالوگ فقط بعد از موفقیتِ درخواست بسته
 * می‌شود (`onConfirm(reason, close)`)، تا اگر سرور رد کرد متنِ نوشته‌شده
 * از دست نرود.
 */
export default function ReturnStatusReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm,
}) {
  const [reason, setReason] = useState("");

  const close = () => {
    setReason("");
    onOpenChange(false);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (isPending) return;
    onConfirm(reason, close);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="py-3">
            <FormField
              label="دلیل (اختیاری)"
              htmlFor="return-status-reason"
              hint={`${reason.length} / ${RETURN_STATUS_REASON_MAX_LENGTH}`}
            >
              <Textarea
                id="return-status-reason"
                value={reason}
                maxLength={RETURN_STATUS_REASON_MAX_LENGTH}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                disabled={isPending}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={isPending}
            >
              انصراف
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "در حال ثبت..." : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
