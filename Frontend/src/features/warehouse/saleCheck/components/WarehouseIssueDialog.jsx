import { useState } from "react";

import FormField from "@/shared/components/forms/FormField";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import UnitBarcodeScanList from "@/shared/components/barcode/UnitBarcodeScanList";
import Notice from "@/shared/components/feedback/Notice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  UNIT_ACTION_REASON_LABELS,
  UnitActionReasonEnum,
} from "@/features/warehouse/units/domain/unitVocabulary";
import { DEFECT_REASONS } from "../domain/saleCheck";
import { useInStockUnitsQuery } from "../services/queries";
import OptionSelect from "@/shared/components/forms/OptionSelect";
import DialogActions from "@/shared/components/feedback/DialogActions";

const KIND_OPTIONS = [
  { value: "defect", label: "معیوب", hint: "دانه را اسکن کنید؛ همان لحظه به قرنطینه می‌رود." },
  { value: "missing", label: "مفقود", hint: "دانه پیدا نشد؛ از فهرستِ دانه‌های «در انبار» انتخابش کنید." },
];

/**
 * گزارشِ یک دانه‌ی معیوب یا مفقود در بررسیِ انبار (نادر). با ثبتِ بررسی، دانه قرنطینه و به
 * صفِ حسابداری می‌رود؛ پیش‌فاکتور منتظرش نمی‌ماند — انباردار دانه‌ی سالمِ دیگری اسکن می‌کند.
 *
 * @param items     ردیف‌های پیش‌فاکتور (برای انتخابِ کالا)
 * @param excluded  بارکدهایی که اسکن یا گزارش شده‌اند
 * @param onAdd     `({ productId, productName, productUnitBarcode, reason, description }) => void`
 */
export default function WarehouseIssueDialog({ open, onOpenChange, items, excluded, onAdd }) {
  const [kind, setKind] = useState("defect");
  const [productId, setProductId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [reason, setReason] = useState(DEFECT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const product = items.find((item) => String(item.productId) === String(productId));
  const units = useInStockUnitsQuery(kind === "missing" ? product?.productId : null);
  const candidates = (units.data?.items ?? []).filter((unit) => !excluded.has(unit.barcode));

  const reset = () => {
    setKind("defect");
    setProductId("");
    setBarcode("");
    setReason(DEFECT_REASONS[0]);
    setDescription("");
    setShowErrors(false);
  };

  const errors = {
    product: !product && "کالا را انتخاب کنید",
    barcode: !barcode && (kind === "missing" ? "دانه را انتخاب کنید" : "دانه را اسکن کنید"),
    description: !description.trim() && "توضیح الزامی است",
  };
  const valid = !Object.values(errors).some(Boolean);

  const submit = () => {
    if (!valid) return setShowErrors(true);
    onAdd({
      productId: product.productId,
      productName: product.productName,
      productUnitBarcode: barcode,
      reason: kind === "missing" ? UnitActionReasonEnum.MISSING : Number(reason),
      description: description.trim(),
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>گزارش دانه‌ی معیوب یا مفقود</DialogTitle>
          <DialogDescription>
            دانه با ثبتِ بررسی به قرنطینه و صفِ حسابداری می‌رود. اگر دانه‌ی سالمِ دیگری روی قفسه هست، آن را در ردیفِ همان کالا
            اسکن کنید تا پیش‌فاکتور متوقف نشود.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <StatusChoice
            label="نوعِ مشکل"
            options={KIND_OPTIONS}
            value={kind}
            onChange={(next) => {
              setKind(next);
              setBarcode("");
            }}
          />

          <FormField label="کالا" required error={showErrors && errors.product ? { message: errors.product } : undefined}>
            <OptionSelect
              value={productId}
              onChange={(value) => {
                setProductId(value);
                setBarcode("");
              }}
              placeholder="انتخاب کالا"
              options={[...new Map(items.map((item) => [item.productId, item])).values()].map((item) => ({
                value: item.productId,
                label: item.productName,
              }))}
            />
          </FormField>

          {product && kind === "defect" && (
            <div className="space-y-1.5">
              <UnitBarcodeScanList
                productId={product.productId}
                barcodes={barcode ? [barcode] : []}
                max={1}
                required
                onChange={(codes) => setBarcode(codes[0] ?? "")}
              />
              {showErrors && errors.barcode && <p className="text-xs text-destructive">{errors.barcode}</p>}
              {barcode && excluded.has(barcode) && (
                <Notice tone="caution">این دانه در ردیف‌ها اسکن شده؛ با ثبتِ گزارش از اسکن‌ها برداشته می‌شود.</Notice>
              )}
            </div>
          )}

          {product && kind === "missing" && (
            <FormField
              label="دانه‌ی مفقود"
              required
              error={showErrors && errors.barcode ? { message: errors.barcode } : undefined}
              hint={units.isFetching ? "در حال دریافتِ دانه‌ها…" : candidates.length === 0 ? "دانه‌ی «در انبار»ی برای این کالا نیست." : undefined}
            >
              <OptionSelect
                dir="ltr"
                value={barcode}
                onChange={setBarcode}
                disabled={candidates.length === 0}
                placeholder="انتخاب دانه"
                options={candidates.map((unit) => ({
                  value: unit.barcode,
                  label: (
                    <>
                      <span className="font-mono text-xs">{unit.barcode}</span>
                      {unit.binLocation && <span className="text-muted-foreground"> · {unit.binLocation}</span>}
                    </>
                  ),
                }))}
              />
            </FormField>
          )}

          {kind === "defect" && (
            <FormField label="علت">
              <OptionSelect
                value={reason}
                onChange={setReason}
                numeric
                options={DEFECT_REASONS.map((value) => ({ value, label: UNIT_ACTION_REASON_LABELS[value] }))}
              />
            </FormField>
          )}

          <FormField
            label="توضیح"
            htmlFor="issue-description"
            required
            error={showErrors && errors.description ? { message: errors.description } : undefined}
          >
            <Textarea
              id="issue-description"
              rows={3}
              value={description}
              placeholder={kind === "missing" ? "کجا گشتید، آخرین بار کجا بود…" : "کارتن پاره، بدنه ترک خورده…"}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
        </div>

        <DialogActions onCancel={() => onOpenChange(false)} onSubmit={submit} submitLabel="افزودن به گزارش" />
      </DialogContent>
    </Dialog>
  );
}
