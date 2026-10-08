import toast from "react-hot-toast";
import { Download, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { applyUpdate, blockedMessage, setUpdateDialogOpen } from "@/shared/services/appUpdate";

/**
 * اعلانِ «نسخه‌ی تازه آماده است». با «بعداً» بسته می‌شود ولی بروزرسانی از
 * دست نمی‌رود: نقطه‌ی روی منوی کاربر و «بروزرسانی برنامه» همان‌جا می‌مانند.
 */
export default function UpdateAvailableToast({ id }) {
  return (
    <div
      dir="rtl"
      className="flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg"
    >
      <Download className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-medium">نسخه‌ی تازه‌ی برنامه آماده است</p>
          <p className="text-xs text-muted-foreground">
            با بروزرسانی صفحه دوباره بارگذاری می‌شود؛ فرمِ نیمه‌کاره را اول ذخیره کنید.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const { started, reason } = applyUpdate();
              if (started) toast.dismiss(id);
              else if (reason) toast.error(blockedMessage(reason));
            }}
          >
            بروزرسانی
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              toast.dismiss(id);
              setUpdateDialogOpen(true);
            }}
          >
            جزئیات
          </Button>
        </div>
      </div>
      <button
        type="button"
        aria-label="بعداً"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => toast.dismiss(id)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
