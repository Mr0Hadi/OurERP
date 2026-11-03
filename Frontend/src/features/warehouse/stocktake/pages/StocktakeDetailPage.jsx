import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Ban, CheckCheck, ClipboardCheck, RotateCcw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import SectionCard from "@/shared/components/forms/SectionCard";
import StatusBadge from "@/shared/components/status/StatusBadge";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import Notice from "@/shared/components/feedback/Notice";
import ProgressStat from "@/shared/components/feedback/ProgressStat";
import UnsavedChangesDialog from "@/shared/components/feedback/UnsavedChangesDialog";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { ROUTES } from "@/shared/constants/routes";
import { STOCKTAKE_STATUS_LABELS, STOCKTAKE_STATUS_TONES, StocktakeStatusEnum } from "@/shared/domain/enums/stocktake";
import { gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
import { usePermission } from "@/features/auth/hooks/usePermission";
import AuditHistoryButton from "@/features/audit/components/AuditHistoryButton";
import { useStocktakeQuery } from "../services/queries";
import { useStocktakeTransitionMutation } from "../services/mutations";
import { stocktakeActions } from "../domain/stocktake";
import { useStocktakeCountDrafts } from "../hooks/useStocktakeCountDrafts";
import StocktakeScopeText from "../components/StocktakeScopeText";
import StocktakeScanPanel from "../components/StocktakeScanPanel";
import StocktakeLines from "../components/StocktakeLines";

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** متن و برچسبِ دیالوگِ تأییدِ هر گذار. */
const CONFIRMS = {
  SubmitStocktake: {
    title: "پایانِ شمارش",
    description: "شمارش بسته می‌شود و موجودیِ سیستم و مغایرت‌ها دیده می‌شوند. تا تأیید، کسی با دسترسیِ تأیید می‌تواند شمارش را دوباره باز کند.",
    confirmLabel: "پایانِ شمارش",
    destructive: false,
  },
  ReopenStocktake: {
    title: "بازگشاییِ شمارش",
    description: "انبارگردانی به شمارش برمی‌گردد؛ اسکن‌ها و عددهای ثبت‌شده می‌مانند.",
    confirmLabel: "بازگشایی",
    destructive: false,
  },
  CancelStocktake: {
    title: "لغوِ انبارگردانی",
    description: "هیچ تغییری در موجودی داده نمی‌شود و این انبارگردانی بسته می‌شود. برگشت‌پذیر نیست.",
    confirmLabel: "لغو",
    destructive: true,
  },
};

function approveDescription(stocktake) {
  return (
    <span className="block space-y-1.5">
      <span className="block">
        مغایرت‌ها همان‌طور که این‌جا دیده می‌شوند اعمال می‌شوند و برگشت‌پذیر نیستند:
      </span>
      <span className="block">
        {formatNumber(stocktake.totalMissing)} دانه‌ی کسری اسقاط و {formatNumber(stocktake.totalSurplus)} دانه‌ی مازاد ساخته می‌شود
        (ارزشِ خالص {formatRial(stocktake.totalDifferenceValue)}). کالای شمرده‌نشده تغییری نمی‌کند.
      </span>
    </span>
  );
}

/**
 * یک انبارگردانی (`GetStocktakeDetail`): مشخصات و پیشرفت، اسکن و شمارشِ دستی در وضعیتِ «در حال شمارش»، مغایرت‌ها
 * پس از پایانِ شمارش، و گذارها (پایان، بازگشایی، تأیید، لغو). در شمارشِ کور (`isBlind`) موجودیِ سیستم و مغایرت تا
 * پایانِ شمارش از سرور نمی‌آید.
 */
export default function StocktakeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useStocktakeQuery(id);

  usePageHeader({ title: "انبارگردانی", showBack: true, onBack: () => navigate(ROUTES.WAREHOUSE_STOCKTAKE) });

  if (query.isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (query.isError || !query.data) {
    return (
      <DetailErrorState
        error={query.error}
        notFoundMessage="این انبارگردانی پیدا نشد."
        onRetry={() => query.refetch()}
        onBack={() => navigate(ROUTES.WAREHOUSE_STOCKTAKE)}
      />
    );
  }

  return <StocktakeView stocktake={query.data} />;
}

function StocktakeView({ stocktake }) {
  const { allows } = usePermission();
  const [confirm, setConfirm] = useState(null);
  const counts = useStocktakeCountDrafts(stocktake);
  const blocker = useUnsavedChangesGuard(counts.pending > 0);

  const submit = useStocktakeTransitionMutation("SubmitStocktake");
  const reopen = useStocktakeTransitionMutation("ReopenStocktake");
  const approve = useStocktakeTransitionMutation("ApproveStocktake");
  const cancel = useStocktakeTransitionMutation("CancelStocktake");
  const mutations = { SubmitStocktake: submit, ReopenStocktake: reopen, ApproveStocktake: approve, CancelStocktake: cancel };

  const actions = stocktakeActions(stocktake, allows);
  const submitted = stocktake.status === StocktakeStatusEnum.SUBMITTED;
  const pending = Object.values(mutations).some((mutation) => mutation.isPending);
  // پایان/لغو با عددهای ثبت‌نشده آن‌ها را دور می‌ریزد؛ اول ثبت یا انصراف.
  const unsaved = counts.pending > 0 || counts.saving;
  const active = confirm && mutations[confirm];
  const confirmText =
    confirm === "ApproveStocktake"
      ? { title: "تأیید و اعمالِ مغایرت", description: approveDescription(stocktake), confirmLabel: "تأیید و اعمال", destructive: false }
      : CONFIRMS[confirm];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <AuditHistoryButton entityType="Stocktake" entityKey={stocktake.id} title={`انبارگردانی ${stocktake.number}`} />

      <SectionCard
        title={stocktake.title}
        description={<span className="font-mono" dir="ltr">{stocktake.number}</span>}
        action={
          <StatusBadge tone={STOCKTAKE_STATUS_TONES[stocktake.status]}>
            {STOCKTAKE_STATUS_LABELS[stocktake.status] ?? stocktake.statusTitle}
          </StatusBadge>
        }
      >
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="دامنه">
            <StocktakeScopeText stocktake={stocktake} />
          </Field>
          <Field label="انبار">{stocktake.warehouseName || "—"}</Field>
          <Field label="موجودیِ مبنا ثبت شد">{gregorianToPersianDateTime(stocktake.snapshotAt)}</Field>
          {stocktake.submittedAt && <Field label="پایانِ شمارش">{gregorianToPersianDateTime(stocktake.submittedAt)}</Field>}
          {stocktake.approvedAt && <Field label="تأیید">{gregorianToPersianDateTime(stocktake.approvedAt)}</Field>}
          {stocktake.cancelledAt && <Field label="لغو">{gregorianToPersianDateTime(stocktake.cancelledAt)}</Field>}
          {stocktake.note && <Field label="یادداشت">{stocktake.note}</Field>}
        </dl>

        <ProgressStat label="کالاهای شمرده‌شده" done={stocktake.countedLineCount} total={stocktake.lineCount} />

        {stocktake.isBlind && (
          <Notice tone="info">شمارشِ کور: موجودیِ سیستم و مغایرت تا پایانِ شمارش نشان داده نمی‌شود.</Notice>
        )}
        {!stocktake.isBlind && stocktake.totalDifferenceValue != null && (
          <dl className="grid grid-cols-3 gap-3 rounded-lg border border-border p-3">
            <Field label="کسری (دانه)">{formatNumber(stocktake.totalMissing)}</Field>
            <Field label="مازاد (دانه)">{formatNumber(stocktake.totalSurplus)}</Field>
            <Field label="ارزشِ مغایرت">{formatRial(stocktake.totalDifferenceValue)}</Field>
          </dl>
        )}
        {submitted && actions.canApprove && (
          <p className="text-xs text-muted-foreground">
            کسریِ اسکن‌شده‌ها دانه‌ی پیدانشده را اسقاط می‌کند؛ کسریِ شمارشِ دستی تازه‌ترین دانه‌ها را، و مازادِ دستی دانه‌ی تازه با
            قیمتِ خرید می‌سازد.
          </p>
        )}

        {(actions.canSubmit || actions.canReopen || actions.canApprove || actions.canCancel) && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {actions.canSubmit && (
              <Button type="button" size="sm" className="gap-1.5" disabled={pending || unsaved} onClick={() => setConfirm("SubmitStocktake")}>
                <ClipboardCheck className="size-3.5" />
                پایانِ شمارش
              </Button>
            )}
            {actions.canApprove && (
              <Button type="button" size="sm" className="gap-1.5" disabled={pending} onClick={() => setConfirm("ApproveStocktake")}>
                <CheckCheck className="size-3.5" />
                تأیید و اعمالِ مغایرت
              </Button>
            )}
            {actions.canReopen && (
              <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={pending} onClick={() => setConfirm("ReopenStocktake")}>
                <RotateCcw className="size-3.5" />
                بازگشاییِ شمارش
              </Button>
            )}
            {actions.canCancel && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1.5 text-destructive hover:text-destructive"
                disabled={pending || unsaved}
                onClick={() => setConfirm("CancelStocktake")}
              >
                <Ban className="size-3.5" />
                لغو
              </Button>
            )}
          </div>
        )}
        {unsaved && actions.canSubmit && (
          <p className="text-xs text-muted-foreground">برای پایانِ شمارش، اول عددهای ثبت‌نشده را ثبت کنید.</p>
        )}
      </SectionCard>

      {actions.canCount && <StocktakeScanPanel stocktake={stocktake} />}
      <StocktakeLines stocktake={stocktake} canCount={actions.canCount} counts={counts} />

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirmText?.title}
        description={confirmText?.description}
        confirmLabel={confirmText?.confirmLabel}
        pendingLabel="در حال انجام..."
        destructive={confirmText?.destructive}
        isPending={Boolean(active?.isPending)}
        onConfirm={() => {
          // نگهبانِ `null` لازم است: React Compiler این را در خودِ رندر هم می‌خواند.
          if (!active) return;
          active.mutate(stocktake.id, { onSuccess: () => setConfirm(null) });
        }}
      />
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
