import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useSaleQuery } from "@/features/sales/orders/services/queries";
import { useWarehouseApproveMutation } from "@/features/sales/orders/services/mutations";
import { usePermission } from "@/features/auth/hooks/usePermission";
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
import { approvedQuantity, changeDraft, checkSummary, lineNeed } from "../domain/saleCheck";

/**
 * بررسیِ انبارِ یک پیش‌فاکتور: انباردار دانه‌های هر ردیف را اسکن می‌کند و تأیید می‌کند (دانه‌ها رزرو
 * و پیش‌فاکتور «آماده‌ی پرداخت» می‌شود). اگر کالا کم است، تعدادِ ردیف را کم (یا ردیف را حذف)
 * می‌کند، دلیلش را می‌نویسد و همان را تأیید می‌کند — یک دکمه. دانه‌ی معیوب/مفقود جدا گزارش می‌شود.
 */
function SaleCheckForm({ sale }) {
  const navigate = useNavigate();
  const { allows } = usePermission();
  const canEdit = allows("SaleUpdate");
  const mutation = useWarehouseApproveMutation();
  const [quantities, setQuantities] = useState({});
  const [scans, setScans] = useState({});
  const [issues, setIssues] = useState([]);
  const [reason, setReason] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { productMap } = useDocumentProducts((sale.items || []).map((item) => item.productId));
  const items = useMemo(() => withProductInfo(sale.items || [], productMap), [sale.items, productMap]);
  const { changed, blockingReason } = checkSummary(items, { scans, quantities, issues, reason, canEdit });
  const scannedCount = Object.values(scans).reduce((sum, codes) => sum + codes.length, 0);
  const needTotal = items.reduce((sum, item) => sum + lineNeed(item, quantities), 0);

  const dirty = scannedCount > 0 || issues.length > 0 || changed.length > 0 || reason.trim() !== "";
  const blocker = useUnsavedChangesGuard(dirty && !mutation.isSuccess, { reason: "بررسیِ انبارِ پیش‌فاکتور ثبت نشده" });

  const excluded = new Set([...Object.values(scans).flat(), ...issues.map((issue) => issue.productUnitBarcode)]);

  const setQuantity = (item, quantity) => {
    setQuantities((current) => {
      const next = { ...current };
      if (quantity === Number(item.quantity)) delete next[item.id];
      else next[item.id] = quantity;
      // اسکن‌های بیش از نیازِ تازه کنار می‌روند.
      const need = lineNeed(item, next);
      setScans((codes) => ({ ...codes, [item.id]: (codes[item.id] || []).slice(0, need) }));
      return next;
    });
  };

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
    mutation.mutate(
      { sale, quantities, scans, issues, reason: reason.trim() },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          navigate(ROUTES.WAREHOUSE_SALE_CHECK);
        },
        onError: () => setConfirmOpen(false),
      },
    );

  const label = changed.length > 0 ? "تغییر و تأیید انبار" : "تأیید انبار";

  return (
    <div className="container mx-auto max-w-6xl space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            title={`اقلامِ پیش‌فاکتور — ${sale.customerName || ""}`}
            description={
              canEdit
                ? "هر دانه‌ای را که برای مشتری برمی‌دارید اسکن کنید. اگر کالا کم است، تعدادِ تأییدی را کم کنید و دلیلش را بنویسید."
                : "هر دانه‌ای را که برای مشتری برمی‌دارید اسکن کنید."
            }
          >
            {!canEdit && (
              <Notice tone="info">
                تغییرِ تعدادِ اقلام دسترسیِ «ویرایش فروش» می‌خواهد. اگر کالا کم است، به فروش خبر دهید.
              </Notice>
            )}
            {items.map((item) => (
              <SaleCheckItemCard
                key={item.id}
                item={item}
                quantity={approvedQuantity(item, quantities)}
                need={lineNeed(item, quantities)}
                barcodes={scans[item.id] || []}
                canEdit={canEdit}
                onQuantityChange={(quantity) => setQuantity(item, quantity)}
                onBarcodesChange={(codes) => setScans((current) => ({ ...current, [item.id]: codes }))}
              />
            ))}
          </SectionCard>

          <SectionCard
            title="دانه‌ی معیوب یا مفقود"
            description="نادر است. دانه به قرنطینه و صفِ حسابداری می‌رود؛ دانه‌ی سالمِ دیگری را در ردیفِ همان کالا اسکن کنید."
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
          <SectionCard title="تأیید انبار">
            <p className="text-sm">
              <span className="font-semibold tabular-nums">{formatNumber(scannedCount)}</span>
              <span className="text-muted-foreground"> از </span>
              <span className="font-semibold tabular-nums">{formatNumber(needTotal)}</span>
              <span className="text-muted-foreground"> دانه اسکن شده</span>
            </p>
            {changed.length > 0 && (
              <>
                <Notice tone="caution">
                  {formatNumber(changed.length)} ردیف تغییر کرده. پیش‌فاکتورِ تغییرکرده به مشتری داده می‌شود؛ دلیل را بنویسید.
                </Notice>
                <FormField label="دلیلِ تغییر" htmlFor="check-reason" required hint="در تاریخچه‌ی پیش‌فاکتور برای فروش می‌ماند.">
                  <Textarea
                    id="check-reason"
                    rows={3}
                    value={reason}
                    placeholder={changeDraft(changed, quantities)}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </FormField>
                {!reason.trim() && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setReason(`${changeDraft(changed, quantities)} — `)}
                  >
                    شروع با فهرستِ تغییرها
                  </Button>
                )}
              </>
            )}
          </SectionCard>

          <WarehouseSubmitBar
            label={label}
            complete
            canSubmit
            blockingReason={blockingReason}
            isBusy={mutation.isPending}
            onSubmit={() => setConfirmOpen(true)}
            onCancel={() => navigate(ROUTES.WAREHOUSE_SALE_CHECK)}
            hint="پس از تأیید، کالا تا پایانِ مهلتِ رزرو برای مشتری نگه داشته می‌شود."
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
        title={label}
        description={`${
          changed.length > 0 ? `پیش‌فاکتور با ${formatNumber(changed.length)} ردیفِ تغییرکرده ذخیره و ` : "پیش‌فاکتور "
        }تأیید می‌شود و ${formatNumber(scannedCount)} دانه برای مشتری رزرو می‌شود.${
          issues.length ? ` ${formatNumber(issues.length)} دانه هم به قرنطینه می‌رود.` : ""
        }`}
        destructive={false}
        confirmLabel={label}
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
