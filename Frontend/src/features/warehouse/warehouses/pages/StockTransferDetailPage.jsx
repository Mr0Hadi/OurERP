import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Ban, PackageCheck } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import SectionCard from "@/shared/components/forms/SectionCard";
import StatusBadge from "@/shared/components/status/StatusBadge";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { ROUTES } from "@/shared/constants/routes";
import {
  STOCK_TRANSFER_STATUS_LABELS,
  STOCK_TRANSFER_STATUS_TONES,
  StockTransferStatusEnum,
} from "@/shared/domain/enums/stockTransfer";
import { gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import { usePermission } from "@/features/auth/hooks/usePermission";
import AuditHistoryButton from "@/features/audit/components/AuditHistoryButton";
import { useStockTransferQuery } from "../services/queries";
import { useStockTransferTransitionMutation } from "../services/mutations";
import { TransferRoute } from "../components/StockTransferTable";

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

const CONFIRMS = {
  ReceiveStockTransfer: {
    title: "تحویلِ حواله",
    description: "همه‌ی دانه‌های این حواله روی قفسه‌ی مقصد گذاشته می‌شوند و دوباره در موجودی حساب می‌شوند.",
    confirmLabel: "تحویل گرفتم",
    destructive: false,
  },
  CancelStockTransfer: {
    title: "لغوِ حواله",
    description: "دانه‌ها به قفسه‌ی مبدأ برمی‌گردند و حواله بسته می‌شود. برگشت‌پذیر نیست.",
    confirmLabel: "لغوِ حواله",
    destructive: true,
  },
};

function ProductRow({ product }) {
  const [open, setOpen] = useState(false);
  const barcodes = product.barcodes ?? [];
  return (
    <li className="space-y-2 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{product.productName}</p>
          <p className="truncate text-right font-mono text-xs text-muted-foreground" dir="ltr">
            {product.productCode}
          </p>
        </div>
        <span className="shrink-0 text-sm tabular-nums">{formatNumber(product.quantity)} دانه</span>
      </div>
      {barcodes.length > 0 && (
        <>
          <button
            type="button"
            className="text-xs text-primary underline-offset-4 hover:underline"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "پنهان کردنِ بارکدها" : `نمایشِ ${formatNumber(barcodes.length)} بارکد`}
          </button>
          {open && (
            <p className="flex flex-wrap gap-1">
              {barcodes.map((barcode) => (
                <span key={barcode} className="rounded bg-muted px-1.5 font-mono text-xs" dir="ltr">
                  {barcode}
                </span>
              ))}
            </p>
          )}
        </>
      )}
    </li>
  );
}

/**
 * یک حواله (`GetStockTransferDetail`): مسیر، زمان‌ها، کالاها با بارکدِ دانه‌ها، و تحویل/لغو برای حواله‌ی «در راه»
 * (`StockTransferManage`، مستقل از سوییچِ چندانبار).
 */
export default function StockTransferDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { allows } = usePermission();
  const query = useStockTransferQuery(id);
  const [confirm, setConfirm] = useState(null);
  const receive = useStockTransferTransitionMutation("ReceiveStockTransfer");
  const cancel = useStockTransferTransitionMutation("CancelStockTransfer");
  const mutations = { ReceiveStockTransfer: receive, CancelStockTransfer: cancel };

  usePageHeader({ title: "حواله‌ی بین انبار", showBack: true, onBack: () => navigate(ROUTES.WAREHOUSE_TRANSFERS) });

  if (query.isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (query.isError || !query.data) {
    return (
      <DetailErrorState
        error={query.error}
        notFoundMessage="این حواله پیدا نشد."
        onRetry={() => query.refetch()}
        onBack={() => navigate(ROUTES.WAREHOUSE_TRANSFERS)}
      />
    );
  }

  const transfer = query.data;
  const open = transfer.status === StockTransferStatusEnum.IN_TRANSIT;
  const canAct = open && allows("StockTransferManage");
  const pending = receive.isPending || cancel.isPending;
  const active = confirm && mutations[confirm];
  const products = transfer.products ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <AuditHistoryButton entityType="StockTransfer" entityKey={transfer.id} title={`حواله‌ی ${transfer.transferNumber}`} />

      <SectionCard
        title={<TransferRoute transfer={transfer} />}
        description={<span className="font-mono" dir="ltr">{transfer.transferNumber}</span>}
        action={
          <StatusBadge tone={STOCK_TRANSFER_STATUS_TONES[transfer.status]}>
            {STOCK_TRANSFER_STATUS_LABELS[transfer.status] ?? transfer.statusTitle}
          </StatusBadge>
        }
      >
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="دانه‌ها">{formatNumber(transfer.totalUnits)}</Field>
          <Field label="ارسال">{gregorianToPersianDateTime(transfer.dispatchedAt)}</Field>
          {transfer.receivedAt && <Field label="تحویل">{gregorianToPersianDateTime(transfer.receivedAt)}</Field>}
          {transfer.cancelledAt && <Field label="لغو">{gregorianToPersianDateTime(transfer.cancelledAt)}</Field>}
          {transfer.description && <Field label="توضیح">{transfer.description}</Field>}
        </dl>
        {open && (
          <p className="text-xs text-muted-foreground">
            تا تحویل، این دانه‌ها در هیچ انباری روی قفسه نیستند و فروخته نمی‌شوند، ولی در ارزشِ موجودی «در راه» حساب می‌شوند.
          </p>
        )}
        {canAct && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button type="button" size="sm" className="gap-1.5" disabled={pending} onClick={() => setConfirm("ReceiveStockTransfer")}>
              <PackageCheck className="size-3.5" />
              تحویل در مقصد
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5 text-destructive hover:text-destructive"
              disabled={pending}
              onClick={() => setConfirm("CancelStockTransfer")}
            >
              <Ban className="size-3.5" />
              لغو
            </Button>
          </div>
        )}
      </SectionCard>

      <SectionCard title={`کالاها (${formatNumber(products.length)})`}>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {products.map((product) => (
            <ProductRow key={product.productId} product={product} />
          ))}
        </ul>
      </SectionCard>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(value) => !value && setConfirm(null)}
        title={CONFIRMS[confirm]?.title}
        description={CONFIRMS[confirm]?.description}
        confirmLabel={CONFIRMS[confirm]?.confirmLabel}
        pendingLabel="در حال انجام..."
        destructive={CONFIRMS[confirm]?.destructive}
        isPending={Boolean(active?.isPending)}
        onConfirm={() => {
          // نگهبانِ `null`: React Compiler این را در خودِ رندر هم می‌خواند.
          if (!active) return;
          active.mutate(transfer.id, { onSuccess: () => setConfirm(null) });
        }}
      />
    </div>
  );
}
