import { useEffect } from "react";
import { useReturnInspectionFormStore } from "../store/returnInspectionFormStore";

/**
 * فرم تحویل‌گرفتن کالای مرجوعی.
 *
 * انباردار برای هر ردیف دو عدد می‌دهد: چقدر رسید، و چقدرش سالم بود.
 * تفاوت این دو، کالایی است که دریافت می‌شود و ادعا را می‌بندد ولی وارد
 * موجودی قابل‌فروش نمی‌شود.
 *
 * جای «نوع مشکل» هم همین‌جاست، ولی از همان واژگان ادعا (RETURN_PROBLEMS)
 * استفاده می‌کند نه یک فهرست موازی — چون مشاهده‌ی انبار و ادعای مشتری
 * دو *دیدگاه* از یک چیزند، نه دو چیز متفاوت.
 */
export function useReturnInspectionForm(salesReturn) {
  const {
    formData,
    setFormData,
    setLines,
    initializeFromReturn,
    initializedForId,
    resetForm,
  } = useReturnInspectionFormStore();

  const returnVersion =
    salesReturn?.id != null ? `${salesReturn.id}:${salesReturn.updatedAt}` : null;

  useEffect(() => {
    if (returnVersion && initializedForId !== returnVersion) {
      initializeFromReturn(salesReturn);
    }
  }, [returnVersion, salesReturn, initializeFromReturn, initializedForId]);

  const lines = formData.lines || [];

  const handleLineChange = (effectId, field, value) => {
    setLines(
      lines.map((line) => {
        if (line.effectId !== effectId) return line;

        if (field === "qtyThisRound") {
          const num = Number(value);
          const qty =
            Number.isNaN(num) || num < 0
              ? 0
              : Math.min(num, line.remainingQty);
          // بخش سالم هرگز نمی‌تواند از کل دریافتی بیشتر باشد
          return {
            ...line,
            qtyThisRound: qty,
            healthyQtyThisRound: Math.min(line.healthyQtyThisRound, qty),
          };
        }

        if (field === "healthyQtyThisRound") {
          const num = Number(value);
          const healthy =
            Number.isNaN(num) || num < 0
              ? 0
              : Math.min(num, line.qtyThisRound);
          return { ...line, healthyQtyThisRound: healthy };
        }

        return { ...line, [field]: value };
      }),
    );
  };

  const isTransporterValid =
    !!formData.transporterName?.trim() &&
    (!!formData.transporterNationalId?.trim() || !!formData.vehiclePlate?.trim());

  const hasSomethingToRecord = lines.some(
    (line) => (Number(line.qtyThisRound) || 0) > 0,
  );

  const isAllComplete = lines.every(
    (line) => (Number(line.qtyThisRound) || 0) >= line.remainingQty,
  );

  const damagedTotal = lines.reduce(
    (sum, line) =>
      sum +
      Math.max(
        0,
        (Number(line.qtyThisRound) || 0) - (Number(line.healthyQtyThisRound) || 0),
      ),
    0,
  );

  const buildPayload = () => ({
    lines: lines
      .filter((line) => (Number(line.qtyThisRound) || 0) > 0)
      .map((line) => ({
        effectId: line.effectId,
        qty: Number(line.qtyThisRound) || 0,
        healthyQty: Number(line.healthyQtyThisRound) || 0,
        issueProblem: line.issueProblem || null,
        issueNote: line.issueNote || "",
      })),
    receivingNote: formData.receivingNote,
    receivedDate: formData.receivedDate,
    transporterName: formData.transporterName,
    transporterNationalId: formData.transporterNationalId,
    vehiclePlate: formData.vehiclePlate,
  });

  return {
    formData,
    setFormData,
    lines,
    handleLineChange,
    isTransporterValid,
    hasSomethingToRecord,
    isAllComplete,
    damagedTotal,
    buildPayload,
    resetForm,
    initializedForId,
  };
}
