import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import SectionCard from "@/shared/components/forms/SectionCard";
import FormField from "@/shared/components/forms/FormField";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import UnitBarcodeScanList from "@/shared/components/barcode/UnitBarcodeScanList";
import Notice from "@/shared/components/feedback/Notice";
import EmptyState from "@/shared/components/feedback/EmptyState";
import UnsavedChangesDialog from "@/shared/components/feedback/UnsavedChangesDialog";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import ProductSelect from "@/features/warehouse/products/components/ProductSelect";
import { useProductWarehouseStockQuery, useWarehousesQuery } from "../services/queries";
import { useCreateStockTransferMutation } from "../services/mutations";
import { useMultiWarehouse } from "../hooks/useMultiWarehouse";
import { emptyTransferDraft, toApiTransfer, transferDraftErrors } from "../domain/warehouse";
import WarehouseSelect from "../components/WarehouseSelect";

/** یک ردیف: تعداد (سقف = موجودیِ قفسه‌ی مبدأ) و بارکدها (الزامی برای کالای با ردیابیِ دانه‌ای). */
function TransferLine({ line, fromWarehouseId, onChange, onRemove }) {
  const stock = useProductWarehouseStockQuery(line.productId);
  const inSource = stock.data?.find((row) => row.warehouseId === fromWarehouseId)?.inStock;
  const short = inSource != null && line.quantity > inSource;

  return (
    <li className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{line.name}</p>
          <p className="truncate text-right font-mono text-xs text-muted-foreground" dir="ltr">
            {line.code}
          </p>
        </div>
        <Button type="button" size="icon-sm" variant="ghost" aria-label={`برداشتنِ ${line.name}`} onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={short ? `text-xs ${toneText("danger")}` : "text-xs text-muted-foreground"}>
          {fromWarehouseId == null
            ? "اول انبارِ مبدأ را انتخاب کنید"
            : inSource == null
              ? "موجودیِ مبدأ…"
              : `روی قفسه‌ی مبدأ: ${formatNumber(inSource)}`}
        </span>
        <QuantityStepper
          size="sm"
          min={1}
          max={inSource || undefined}
          value={line.quantity}
          onChange={(quantity) => onChange({ quantity: quantity || 1, barcodes: line.barcodes.slice(0, quantity || 1) })}
        />
      </div>
      <UnitBarcodeScanList
        productId={line.productId}
        barcodes={line.barcodes}
        max={line.quantity}
        required={line.requiresUnitTracking}
        onChange={(barcodes) => onChange({ barcodes })}
      />
      {!line.requiresUnitTracking && line.barcodes.length === 0 && (
        <p className="text-[11px] text-muted-foreground">بی اسکن، قدیمی‌ترین دانه‌های قفسه‌ی مبدأ برداشته می‌شوند.</p>
      )}
    </li>
  );
}

/**
 * حواله‌ی تازه (`CreateStockTransfer`، `StockTransferManage`، فقط با چندانبارِ روشن): مبدأ، مقصد و کالاها. با ثبت،
 * دانه‌ها از قفسه‌ی مبدأ بیرون می‌روند و «در راه» می‌شوند تا مقصد تحویل بگیرد.
 */
export default function StockTransferNewPage() {
  const navigate = useNavigate();
  const multi = useMultiWarehouse();
  const { data: warehouses = [] } = useWarehousesQuery();
  const create = useCreateStockTransferMutation();
  const [draft, setDraft] = useState(emptyTransferDraft);
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState(false);
  const blocker = useUnsavedChangesGuard(!saved && draft.lines.length > 0);

  usePageHeader({ title: "حواله‌ی تازه", showBack: true, onBack: () => navigate(ROUTES.WAREHOUSE_TRANSFERS) });

  const errors = transferDraftErrors(draft);
  const errorOf = (field) => (showErrors && errors[field] ? { message: errors[field] } : undefined);
  const patch = (next) => setDraft((current) => ({ ...current, ...next }));
  const patchLine = (productId, next) =>
    patch({ lines: draft.lines.map((line) => (line.productId === productId ? { ...line, ...next } : line)) });

  const addProduct = (id, product) => {
    if (!id || draft.lines.some((line) => line.productId === id)) return;
    patch({
      lines: [
        ...draft.lines,
        {
          productId: id,
          name: product?.name ?? `#${id}`,
          code: product?.code,
          requiresUnitTracking: Boolean(product?.requiresUnitTracking),
          quantity: 1,
          barcodes: [],
        },
      ],
    });
  };

  const handleSubmit = () => {
    const tracked = draft.lines.find((line) => line.requiresUnitTracking && line.barcodes.length !== line.quantity);
    if (Object.keys(errors).length > 0 || tracked) return setShowErrors(true);
    create.mutate(toApiTransfer(draft), {
      onSuccess: (transfer) => {
        setSaved(true);
        // بعد از رندرِ `saved`، تا نگهبانِ تغییراتِ ذخیره‌نشده جلوی رفتن را نگیرد.
        setTimeout(() => navigate(routeWithId(ROUTES.WAREHOUSE_TRANSFERS_DETAIL, transfer.id), { replace: true }));
      },
    });
  };

  if (!multi.isPending && !multi.enabled) {
    return (
      <EmptyState
        fill
        icon={ArrowLeftRight}
        title="چندانبار خاموش است"
        description="حواله‌ی تازه فقط وقتی چندانبار در تنظیمات روشن است ثبت می‌شود."
      />
    );
  }

  const untracked = showErrors && draft.lines.find((line) => line.requiresUnitTracking && line.barcodes.length !== line.quantity);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-24">
      <SectionCard title="مسیر">
        <fieldset disabled={create.isPending} className="grid gap-3 sm:grid-cols-2">
          <FormField label="از انبار" required error={errorOf("fromWarehouseId")}>
            <WarehouseSelect
              always
              value={draft.fromWarehouseId}
              onChange={(fromWarehouseId) => patch({ fromWarehouseId })}
              aria-label="انبارِ مبدأ"
            />
          </FormField>
          <FormField label="به انبار" required error={errorOf("toWarehouseId")}>
            <WarehouseSelect
              always
              value={draft.toWarehouseId}
              exclude={draft.fromWarehouseId}
              onChange={(toWarehouseId) => patch({ toWarehouseId })}
              aria-label="انبارِ مقصد"
            />
          </FormField>
        </fieldset>
        {warehouses.length < 2 && (
          <Notice tone="info">برای حواله دست‌کم دو انبارِ فعال لازم است؛ از صفحه‌ی انبارها انبارِ تازه بسازید.</Notice>
        )}
      </SectionCard>

      <SectionCard title={`کالاها (${formatNumber(draft.lines.length)})`}>
        <ProductSelect value="" onSelect={addProduct} label="افزودنِ کالا" placeholder="جست‌وجوی نام، کد یا بارکد..." />
        {errorOf("lines") && <p className="text-xs text-destructive">{errors.lines}</p>}
        {untracked && (
          <p className="text-xs text-destructive">
            «{untracked.name}» ردیابیِ دانه‌ای دارد؛ همه‌ی {formatNumber(untracked.quantity)} دانه را اسکن کنید.
          </p>
        )}
        {draft.lines.length > 0 && (
          <ul className="space-y-2">
            {draft.lines.map((line) => (
              <TransferLine
                key={line.productId}
                line={line}
                fromWarehouseId={draft.fromWarehouseId}
                onChange={(next) => patchLine(line.productId, next)}
                onRemove={() => patch({ lines: draft.lines.filter((item) => item.productId !== line.productId) })}
              />
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="توضیح">
        <Textarea
          rows={2}
          maxLength={500}
          value={draft.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="مثلاً تأمینِ شعبه (اختیاری)"
          aria-label="توضیحِ حواله"
        />
        {errorOf("description") && <p className="text-xs text-destructive">{errors.description}</p>}
      </SectionCard>

      <div className="sticky bottom-2 z-10 flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-lg">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          {formatNumber(draft.lines.reduce((sum, line) => sum + line.quantity, 0))} دانه
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate(ROUTES.WAREHOUSE_TRANSFERS)}>
          انصراف
        </Button>
        <Button type="button" size="sm" className="gap-1.5" disabled={create.isPending} onClick={handleSubmit}>
          <ArrowLeftRight className="size-3.5" />
          {create.isPending ? "در حالِ ثبت..." : "ثبت و ارسال"}
        </Button>
      </div>

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
