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
 * «تغییرات ذخیره نشده» — یا با `blocker`ِ `useUnsavedChangesGuard`، یا
 * کنترل‌شده با `open`/`onConfirm`/`onCancel` (برای بستنِ Sheet).
 */
export default function UnsavedChangesDialog({
  blocker,
  open,
  onConfirm,
  onCancel,
}) {
  const isOpen = blocker ? blocker.state === "blocked" : Boolean(open);
  const confirm = blocker ? () => blocker.proceed() : onConfirm;
  const cancel = blocker ? () => blocker.reset() : onCancel;

  return (
    <AlertDialog open={isOpen} onOpenChange={(next) => !next && cancel?.()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تغییرات ذخیره نشده</AlertDialogTitle>
          <AlertDialogDescription>
            تغییراتِ دسترسی هنوز ذخیره نشده‌اند و با ادامه از بین می‌روند.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancel}>ماندن و ذخیره</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            نادیده گرفتن تغییرات
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
