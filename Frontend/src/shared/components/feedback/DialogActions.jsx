import { Button } from "@/shared/components/ui/button";
import { DialogFooter } from "@/shared/components/ui/dialog";
import { cn } from "@/shared/lib/utils";

/**
 * پاورقیِ دیالوگِ فرم: «انصراف» + دکمه‌ی ثبت با متنِ «در حال ثبت...» تا پایانِ درخواست.
 * همه‌ی دیالوگ‌ها یک ترتیب دارند (انصراف اول) و هر دو دکمه حینِ درخواست قفل‌اند.
 *
 * @param {string} submitLabel متنِ دکمه‌ی ثبت
 * @param {() => void} onCancel
 * @param {() => void} [onSubmit] بی آن دکمه `type="submit"` است (دیالوگی که `<form>` دارد)
 * @param {boolean} [isPending] درخواست در جریان است
 * @param {boolean} [disabled] ثبت به دلیلِ دیگری ممکن نیست (فرمِ ناقص)
 * @param {string} [pendingLabel]
 * @param {"default"|"destructive"} [variant] دکمه‌ی ثبت؛ `destructive` برای کارِ برگشت‌ناپذیر
 * @param {React.ReactNode} [children] متنِ کمکی در سمتِ دیگرِ پاورقی (مثلاً شمارِ انتخاب‌شده‌ها)
 */
export default function DialogActions({
  submitLabel,
  onCancel,
  onSubmit,
  isPending = false,
  disabled = false,
  pendingLabel = "در حال ثبت...",
  variant = "default",
  cancelLabel = "انصراف",
  className,
  children,
}) {
  return (
    <DialogFooter className={cn("gap-2", children && "sm:items-center", className)}>
      {children && <span className="me-auto text-xs text-muted-foreground">{children}</span>}
      <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
        {cancelLabel}
      </Button>
      <Button
        type={onSubmit ? "button" : "submit"}
        variant={variant}
        onClick={onSubmit}
        disabled={isPending || disabled}
      >
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </DialogFooter>
  );
}
