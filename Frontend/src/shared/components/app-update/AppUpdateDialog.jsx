import { CheckCircle2, Download, Loader2, RefreshCw, WifiOff } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import Notice from "@/shared/components/feedback/Notice";
import {
  APP_BUILD,
  UPDATE_STATUS,
  applyUpdate,
  checkForUpdate,
  setUpdateDialogOpen,
  useAppUpdateStore,
} from "@/shared/services/appUpdate";

const dateTimeFormat = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});
const timeFormat = new Intl.DateTimeFormat("fa-IR", { timeStyle: "short" });

const formatDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
};

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end">{children}</span>
    </div>
  );
}

/** یک خط برای هر وضعیت — همان چیزی که کاربر باید بداند و کاری که می‌تواند بکند. */
function StatusLine({ status, supported }) {
  if (!supported) {
    return (
      <Notice tone="neutral">
        بروزرسانی فقط در نسخه‌ی منتشرشده فعال است (در حالتِ توسعه service worker ثبت نمی‌شود).
      </Notice>
    );
  }
  switch (status) {
    case UPDATE_STATUS.CHECKING:
      return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          در حال بررسی و دریافتِ نسخه‌ی تازه…
        </p>
      );
    case UPDATE_STATUS.AVAILABLE:
    case UPDATE_STATUS.UPDATING:
      return (
        <Notice tone="info" icon={Download}>
          نسخه‌ی تازه دریافت شده و آماده است. با بروزرسانی، صفحه دوباره بارگذاری می‌شود؛ اگر فرمی را نیمه‌کاره
          دارید اول ذخیره‌اش کنید.
        </Notice>
      );
    case UPDATE_STATUS.UP_TO_DATE:
      return (
        <Notice tone="success" icon={CheckCircle2}>
          از آخرین نسخه استفاده می‌کنید.
        </Notice>
      );
    case UPDATE_STATUS.ERROR:
      return (
        <Notice tone="warning" icon={WifiOff}>
          ارتباط با سرور برقرار نشد؛ اتصال را بررسی و دوباره امتحان کنید.
        </Notice>
      );
    default:
      return (
        <p className="text-sm text-muted-foreground">
          برنامه خودش هر ۱۵ دقیقه نسخه‌ی تازه را بررسی می‌کند؛ برای بررسیِ همین حالا دکمه‌ی زیر را بزنید.
        </p>
      );
  }
}

/**
 * «بروزرسانی برنامه» — نسخه‌ی فعلی، بررسیِ دستیِ نسخه‌ی تازه و فعال‌کردنش.
 * یک بار در `App` سوار است و از منوی کاربر در سایدبار و از اعلانِ «نسخه‌ی
 * تازه» با `setUpdateDialogOpen(true)` باز می‌شود.
 */
export default function AppUpdateDialog() {
  const { supported, status, lastCheckedAt, dialogOpen } = useAppUpdateStore();
  const checking = status === UPDATE_STATUS.CHECKING;
  const available = status === UPDATE_STATUS.AVAILABLE;
  const updating = status === UPDATE_STATUS.UPDATING;

  return (
    <Dialog open={dialogOpen} onOpenChange={setUpdateDialogOpen}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>بروزرسانی برنامه</DialogTitle>
          <DialogDescription>نسخه‌ای که الان باز است و بررسیِ نسخه‌ی تازه.</DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border rounded-lg border border-border px-3">
          <Row label="نسخه">
            <span className="font-mono text-xs" dir="ltr">
              {APP_BUILD.version}
              {APP_BUILD.commit && ` · ${APP_BUILD.commit}`}
            </span>
          </Row>
          <Row label="تاریخ انتشار">{formatDateTime(APP_BUILD.builtAt)}</Row>
          {lastCheckedAt && <Row label="آخرین بررسی">{timeFormat.format(lastCheckedAt)}</Row>}
        </div>

        <StatusLine status={status} supported={supported} />

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!supported || checking || updating}
            onClick={() => checkForUpdate()}
          >
            <RefreshCw className={checking ? "animate-spin" : ""} />
            بررسیِ نسخه‌ی تازه
          </Button>
          {(available || updating) && (
            <Button type="button" disabled={updating} onClick={applyUpdate}>
              {updating ? <Loader2 className="animate-spin" /> : <Download />}
              {updating ? "در حال بروزرسانی…" : "بروزرسانی و بارگذاری دوباره"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
