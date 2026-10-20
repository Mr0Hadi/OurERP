import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useSaleQuery } from "@/features/sales/orders/services/queries";
import { useCheckSaleWarehouseMutation } from "@/features/sales/orders/services/mutations";
import { useDocumentProducts } from "@/features/warehouse/products/services/queries";
import { UNIT_ACTION_REASON_LABELS } from "@/features/warehouse/units/domain/unitVocabulary";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import Notice from "@/shared/components/feedback/Notice";
import FormField from "@/shared/components/forms/FormField";
import SectionCard from "@/shared/components/forms/SectionCard";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SALE_PROFORMA_STAGE_LABELS, SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { isSaleProforma } from "@/shared/domain/enums/saleStatus";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import UnsavedChangesDialog from "@/features/permissions/components/UnsavedChangesDialog";
import { formatNumber } from "@/shared/lib/numberFormat";
import { withProductInfo } from "../../shared/productInfo";
import WarehouseSubmitBar from "../../shared/WarehouseSubmitBar";
import SaleCheckItemCard from "../components/SaleCheckItemCard";
import WarehouseIssueDialog from "../components/WarehouseIssueDialog";
import { buildCheckCommand, checkSummary, lineNeed, shortageDraft } from "../domain/saleCheck";

/**
 * بررسیِ انبارِ یک پیش‌فاکتور: انباردار دانه‌های هر ردیف را اسکن می‌کند (با ثبت رزرو می‌شوند و
 * پیش‌فاکتور «آماده‌ی پرداخت» می‌شود). اگر کالا کم است، کسری با دلیلِ نوشته‌شده به فروش برمی‌گردد
 * و هیچ دانه‌ای رزرو نمی‌شود. دانه‌ی معیوب/مفقود جدا گزارش می‌شود (`WarehouseIssueDialog`).
 */
function SaleCheckForm({ sale }) {
  const navigate = useNavigate();
  const mutation = useCheckSaleWarehouseMutation();
  const [scans, setScans] = useState({});
  const [issues, setIssues] = useState([]);
  const [note, setNote] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { productMap } = useDocumentProducts((sale.items || []).map((item) => item.productId));
  const items = useMemo(() => withProductInfo(sale.items || [], productMap), [sale.items, productMap]);
  const { short, complete, blockingReason } = checkSummary(items, scans, issues, note);
  const scannedCount = Object.values(scans).reduce((sum, codes) => sum + codes.length, 0);
  const needTotal = items.reduce((sum, item) => sum + lineNeed(item), 0);

  const dirty = scannedCount > 0 || issues.length > 0 || note.trim() !== "";
  const blocker = useUnsavedChangesGuard(dirty && !mutation.isSuccess, { reason: "بررسیِ انبارِ پیش‌فاکتور ثبت نشده" });

  const excluded = new Set([...Object.values(scans).flat(), ...issues.map((issue) => issue.productUnitBarcode)]);

  const addIssue = (issue) => {
    setIssues((list) => [...list, issue]);
    // دانه‌ی معیوب نمی‌تواند هم‌زمان در ردیف‌ها باشد (سرور ۴۰۰ می‌دهد).
    setScans((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, codes]) => [id, codes.filter((code) => code !== issue.productUnitBarcode)]),
      ),
    );
  };

  const submit = () =>
    mutation.mutate(buildCheckCommand(sale, scans, issues, note), {
      onSuccess: () => {
        setConfirmOpen(false);
        navigate(ROUTES.WAREHOUSE_SALE_CHECK);
      },
    });

  return (
    <div className="container mx-auto max-w-6xl space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            title={`اقلامِ پیش‌فاکتور — ${sale.customerName || ""}`}
            description="هر دانه‌ای را که برای این مشتری برمی‌دارید اسکن کنید. با ثبت، همین دانه‌ها برای او رزرو می‌شوند."
          >
            {items.map((item) => (
              <SaleCheckItemCard
                key={item.id}
                item={item}
                barcodes={scans[item.id] || []}
                onChange={(codes) => setScans((current) => ({ ...current, [item.id]: codes }))}
              />
            ))}
          </SectionCard>

          <SectionCard
            title="دانه‌ی معیوب یا مفقود"
            description="نادر است. گزارش، پیش‌فاکتور را متوقف نمی‌کند؛ تصمیمِ دانه با حسابداری است."
            action={
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setIssueOpen(true)}>
                <Plus className="size-4" />
                گزارش
              </Button>
            }
          >
            {issues.length === 0 ? (
              <p className="text-xs text-muted-foreground">گزارشی ثبت نشده است.</p>
            ) : (
              <ul className="space-y-2">
                {issues.map((issue) => (
                  <li key={issue.productUnitBarcode} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-medium">
                        {issue.productName} · {UNIT_ACTION_REASON_LABELS[issue.reason]}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                        {issue.productUnitBarcode}
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">{issue.description}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      aria-label="حذفِ گزارش"
                      onClick={() =>
                        setIssues((list) => list.filter((x) => x.productUnitBarcode !== issue.productUnitBarcode))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="نتیجه‌ی بررسی">
            <p className="text-sm">
              <span className="font-semibold tabular-nums">{formatNumber(scannedCount)}</span>
              <span className="text-muted-foreground"> از </span>
              <span className="font-semibold tabular-nums">{formatNumber(needTotal)}</span>
              <span className="text-muted-foreground"> دانه اسکن شده</span>
            </p>
            {!complete && (
              <>
                <Notice tone="caution">
                  {formatNumber(short.length)} ردیف کامل نیست. اگر کالا کم است، کسری را ثبت کنید: هیچ دانه‌ای رزرو نمی‌شود و
                  پیش‌فاکتور با دلیلِ شما به فروش برمی‌گردد.
                </Notice>
                <FormField
                  label="دلیلِ کسری (برای فروش)"
                  htmlFor="check-note"
                  required
                  hint="فروش با این توضیح پیش‌فاکتور را با مشتری اصلاح می‌کند."
                >
                  <Textarea
                    id="check-note"
                    rows={3}
                    value={note}
                    placeholder={shortageDraft(short, scans)}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </FormField>
                {!note.trim() && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setNote(`${shortageDraft(short, scans)} — `)}
                  >
                    شروع با فهرستِ کسری
                  </Button>
                )}
              </>
            )}
          </SectionCard>

          <WarehouseSubmitBar
            label={complete ? "تأیید انبار و رزرو" : "ثبت کسری و برگرداندن به فروش"}
            complete={complete}
            canSubmit={complete || scannedCount > 0 || issues.length > 0 || note.trim() !== ""}
            blockingReason={blockingReason}
            isBusy={mutation.isPending}
            onSubmit={() => setConfirmOpen(true)}
            onCancel={() => navigate(ROUTES.WAREHOUSE_SALE_CHECK)}
            hint="پیش‌فاکتور بعد از تأییدِ انبار تا پایانِ مهلتِ رزرو آماده‌ی پرداخت است."
          />
        </div>
      </div>

      <WarehouseIssueDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        items={items}
        excluded={excluded}
        onAdd={addIssue}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={complete ? "تأیید انبار" : "ثبت کسری"}
        description={
          complete
            ? `${formatNumber(scannedCount)} دانه برای این مشتری رزرو و پیش‌فاکتور آماده‌ی پرداخت می‌شود.${
                issues.length ? ` ${formatNumber(issues.length)} دانه هم به قرنطینه می‌رود.` : ""
              }`
            : `هیچ دانه‌ای رزرو نمی‌شود و پیش‌فاکتور با دلیلِ شما به فروش برمی‌گردد.${
                issues.length ? ` ${formatNumber(issues.length)} دانه‌ی گزارش‌شده به قرنطینه می‌رود.` : ""
              }`
        }
        destructive={!complete}
        confirmLabel={complete ? "تأیید و رزرو" : "ثبت کسری"}
        pendingLabel="در حال ثبت..."
        isPending={mutation.isPending}
        onConfirm={submit}
      />
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}

export default function SaleCheckPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: sale, isLoading, isError, error, refetch } = useSaleQuery(id);

  usePageHeader({ title: sale ? `بررسی انبار — ${sale.customerName || ""}` : "بررسی انبار", showBack: true });

  if (isLoading) return <WarehouseFormSkeleton itemActionSlot={false} summaryRows={2} hasSecondaryAction={false} />;
  if (isError || !sale) {
    return (
      <DetailErrorState
        error={error}
        notFoundMessage="پیش‌فاکتور یافت نشد."
        onRetry={refetch}
        onBack={() => navigate(ROUTES.WAREHOUSE_SALE_CHECK)}
      />
    );
  }

  const stage = Number(sale.proformaStage);
  if (!isSaleProforma(sale.status) || stage !== SaleProformaStageEnum.CUSTOMER_APPROVED) {
    return (
      <div className="container mx-auto max-w-2xl space-y-3">
        <Notice tone="info">
          این سند در صفِ انبار نیست
          {isSaleProforma(sale.status) ? ` (مرحله: ${SALE_PROFORMA_STAGE_LABELS[stage]})` : " (فاکتور صادر شده است)"}. شاید کسِ
          دیگری بررسی‌اش کرده یا فروش آن را ویرایش کرده است.
        </Notice>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={ROUTES.WAREHOUSE_SALE_CHECK}>بازگشت به صف</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to={routeWithId(ROUTES.SALES_DETAIL, sale.id)}>دیدنِ پیش‌فاکتور</Link>
          </Button>
        </div>
      </div>
    );
  }

  // نسخه‌ی تازه (ویرایشِ فروش هم‌زمان) فرم را از نو می‌سازد؛ بررسی روی همان نسخه ثبت می‌شود.
  return <SaleCheckForm key={`${sale.id}:${sale.revision}`} sale={sale} />;
}
