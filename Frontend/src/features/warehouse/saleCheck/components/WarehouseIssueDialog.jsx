import { useState } from "react";

import FormField from "@/shared/components/forms/FormField";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import UnitBarcodeScanList from "@/shared/components/barcode/UnitBarcodeScanList";
import Notice from "@/shared/components/feedback/Notice";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  UNIT_ACTION_REASON_LABELS,
  UnitActionReasonEnum,
} from "@/features/warehouse/units/domain/unitVocabulary";
import { DEFECT_REASONS } from "../domain/saleCheck";
import { useInStockUnitsQuery } from "../services/queries";

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
            <Select
              value={String(productId)}
              onValueChange={(value) => {
                setProductId(value);
                setBarcode("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="انتخاب کالا" />
              </SelectTrigger>
              <SelectContent>
                {[...new Map(items.map((item) => [item.productId, item])).values()].map((item) => (
                  <SelectItem key={item.productId} value={String(item.productId)}>
                    {item.productName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Select value={barcode} onValueChange={setBarcode} disabled={candidates.length === 0}>
                <SelectTrigger className="w-full" dir="ltr">
                  <SelectValue placeholder="انتخاب دانه" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((unit) => (
                    <SelectItem key={unit.id} value={unit.barcode} dir="ltr">
                      <span className="font-mono text-xs">{unit.barcode}</span>
                      {unit.binLocation && <span className="text-muted-foreground"> · {unit.binLocation}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          {kind === "defect" && (
            <FormField label="علت">
              <Select value={String(reason)} onValueChange={(value) => setReason(Number(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFECT_REASONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {UNIT_ACTION_REASON_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button type="button" onClick={submit}>
            افزودن به گزارش
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
