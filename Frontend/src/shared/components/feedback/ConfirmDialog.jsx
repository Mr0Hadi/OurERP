import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

/**
 * دیالوگِ تأییدِ یک کارِ برگشت‌ناپذیر (حذف، ابطال، لغو، …).
 *
 * رفتارِ ثابت در همه‌ی برنامه:
 *  - دکمه‌ی تأیید دیالوگ را خودش نمی‌بندد؛ تا پایانِ درخواست باز می‌ماند و متنِ
 *    «در حال …» نشان می‌دهد. فراخوان در `onSuccess` می‌بندد (یا از صفحه می‌رود) —
 *    پس اگر درخواست شکست بخورد، کاربر هنوز همان‌جاست و می‌تواند دوباره تلاش کند.
 *  - وسطِ درخواست با Esc یا کلیک بیرون بسته نمی‌شود.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.description]
 * @param {string} [props.confirmLabel] متنِ دکمه‌ی تأیید، مثلِ «حذف»
 * @param {string} [props.pendingLabel] متنِ دکمه وسطِ درخواست، مثلِ «در حال حذف...»
 * @param {boolean} [props.destructive] دکمه‌ی قرمز (پیش‌فرض روشن؛ برای تأییدِ بی‌خطر خاموش کنید)
 * @param {boolean} [props.isPending]
 * @param {() => void} props.onConfirm
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "تأیید",
  pendingLabel = "در حال انجام...",
  cancelLabel = "انصراف",
  destructive = true,
  isPending = false,
  onConfirm,
  children,
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isPending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          {/* واریانتِ خودِ Button: کلاسِ `bg-destructive` کنارِ `bg-primary`ِ پیش‌فرض می‌نشست و
              ترتیبِ CSS رنگِ اصلی را برنده می‌کرد — دکمه‌ی حذف هیچ‌وقت قرمز نبود. */}
          <AlertDialogAction
            disabled={isPending}
            variant={destructive ? "destructive" : "default"}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
