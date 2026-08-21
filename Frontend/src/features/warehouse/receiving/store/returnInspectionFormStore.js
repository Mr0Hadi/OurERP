import { create } from "zustand";
import { buildGoodsLines } from "@/features/sales/returns/domain/returnResolutions";
import { EFFECT_KINDS } from "@/features/sales/returns/domain/returnEffects";

const EMPTY_INTAKE = {
  returnId: "",
  returnNumber: "",
  customerName: "",
  saleInvoiceNumber: "",
  status: "",
  lines: [],
  receivingNote: "",
  receivedDate: new Date().toISOString().slice(0, 10),
  transporterName: "",
  transporterNationalId: "",
  vehiclePlate: "",
};

/**
 * فرم «تحویل‌گرفتن کالای مرجوعی» در انبار.
 *
 * هر ردیف، یک اثر GOODS_OUT/GOODS_IN معلق است — نه یک قلم فاکتور. یعنی
 * انباردار فقط چیزهایی را می‌بیند که واحد فروش تصمیم گرفته پس گرفته
 * شوند؛ نه کل ادعای مشتری.
 */
export const useReturnInspectionFormStore = create((set, get) => ({
  formData: { ...EMPTY_INTAKE },
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({ formData: { ...state.formData, ...data } })),
  setLines: (lines) =>
    set((state) => ({ formData: { ...state.formData, lines } })),

  initializeFromReturn: (salesReturn) => {
    const version = `${salesReturn.id}:${salesReturn.updatedAt}`;
    if (get().initializedForId === version) return;

    const lines = buildGoodsLines(salesReturn, EFFECT_KINDS.GOODS_IN)
      .filter((line) => line.remainingQty > 0)
      .map((line) => ({
        ...line,
        // پیش‌فرض: کل باقیمانده همین حالا رسیده و سالم است؛ انباردار
        // در صورت نیاز کمش می‌کند.
        qtyThisRound: line.remainingQty,
        healthyQtyThisRound: line.remainingQty,
        issueProblem: "",
        issueNote: "",
      }));

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_INTAKE,
        returnId: salesReturn.id,
        returnNumber: salesReturn.returnNumber,
        customerName: salesReturn.customerName,
        saleInvoiceNumber: salesReturn.saleInvoiceNumber,
        status: salesReturn.status,
        lines,
        receivedDate: new Date().toISOString().slice(0, 10),
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_INTAKE }, initializedForId: null }),
}));
