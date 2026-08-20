import { create } from "zustand";
import { SURPLUS_KIND_LABELS } from "@/shared/constants/purchaseIssueTypes";

const EMPTY_RETURN = {
  purchaseId: "",
  purchaseInvoiceNumber: "",
  supplierId: "",
  supplierName: "",
  returnDate: new Date().toISOString().slice(0, 10),
  reason: "shortage",
  description: "",
  items: [],
  // ادعاهای مازاد در فهرست جداگانه‌ای می‌نشینند، نه کنار کسری‌ها:
  // سقف، دلایل و تصمیم‌های مجازشان فرق دارد و یک کالا می‌تواند
  // هم‌زمان در هر دو فهرست باشد.
  surplusItems: [],
  status: "pending",
  resolutionType: "none",
  refundAmount: "",
  supplierResponseNote: "",
};

function mostFrequent(values) {
  if (!values.length) return "shortage";
  const counts = new Map();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const usePurchaseReturnFormStore = create((set, get) => ({
  formData: { ...EMPTY_RETURN },
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({ formData: { ...state.formData, ...data } })),
  setItems: (items) =>
    set((state) => ({ formData: { ...state.formData, items } })),
  setSurplusItems: (surplusItems) =>
    set((state) => ({ formData: { ...state.formData, surplusItems } })),

  /**
   * فرم ثبت مرجوعی را از روی گزارش کسریِ انبار پر می‌کند — اما برخلاف
   * قبل، ردیف‌ها را بر اساس productId گروه‌بندی می‌کند نه issueId. هر
   * کارت محصول یک «سقف قابل مرجوع» (مجموع همه‌ی مشکلات باز آن کالا)
   * دارد و می‌تواند بین چند «ادعا/claim» با دلیل و تعداد مستقل تقسیم
   * شود — دقیقاً مثل مدل مرجوعی فروش. sourceIssues برای هر محصول نگه
   * داشته می‌شود تا هنگام ساخت payload بتوانیم تعداد هر ادعا را به
   * مشکل(های) اصلی گزارش‌شده‌ی انبار وصل کنیم.
   */
  initializeForReport: (report) => {
    const version = `report:${report.purchaseId}:${report.purchaseUpdatedAt}`;
    if (get().initializedForId === version) return;

    const productMap = new Map();
    report.items.forEach((entry) => {
      const key = entry.productId;
      if (!productMap.has(key)) {
        productMap.set(key, {
          lineId: key,
          productId: entry.productId,
          productCode: entry.productCode,
          productName: entry.productName,
          unit: entry.unit,
          unitPrice: entry.unitPrice,
          maxReturnableQty: 0,
          sourceIssues: [],
          claims: [],
        });
      }
      const line = productMap.get(key);
      line.maxReturnableQty += entry.openShortageQty;
      line.sourceIssues.push({
        issueId: entry.issueId,
        qty: entry.openShortageQty,
        reason: entry.issueType,
        note: entry.issueNote || "",
      });
      // پیش‌فرض: به‌ازای هر مشکل گزارش‌شده توسط انبار، یک ادعا با همان
      // دلیل و تعداد کامل ساخته می‌شود؛ کاربر آزاد است این ادعاها را
      // ویرایش، حذف یا دوباره بین دلایل مختلف تقسیم کند.
      line.claims.push({
        id: generateId(),
        reason: entry.issueType,
        qty: entry.openShortageQty,
        note: entry.issueNote || "",
      });
    });

    // هر ردیف مازاد یک کارت مستقل است و با ردیف‌های دیگرِ همان کالا
    // ادغام نمی‌شود — یادداشت و تاریخ هر دور دریافت بخشی از معنای
    // همان ردیف است، و کالای ثبت‌نشده اصلاً کلیدی برای گروه‌شدن ندارد.
    const surplusLines = (report.surplusItems || []).map((entry) => ({
      lineId: entry.surplusId,
      sourceSurplusId: entry.surplusId,
      surplusKind: entry.surplusKind,
      productId: entry.productId,
      // کالای ثبت‌نشده کد ندارد؛ به‌جای یک خط خالی، نوع مازاد را
      // در همان جای کد نشان می‌دهیم.
      productCode: entry.productCode || SURPLUS_KIND_LABELS[entry.surplusKind],
      productName: entry.productName,
      unit: entry.unit,
      unitPrice: entry.unitPrice,
      maxReturnableQty: entry.openSurplusQty,
      claims: [
        {
          id: generateId(),
          reason: entry.surplusKind,
          qty: entry.openSurplusQty,
          note: entry.note || "",
        },
      ],
    }));

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_RETURN,
        purchaseId: report.purchaseId,
        purchaseInvoiceNumber: report.invoiceNumber,
        supplierId: report.supplierId,
        supplierName: report.supplierName,
        reason: mostFrequent([
          ...report.items.map((i) => i.issueType),
          ...(report.surplusItems || []).map((s) => s.surplusKind),
        ]),
        items: [...productMap.values()],
        surplusItems: surplusLines,
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_RETURN }, initializedForId: null }),
}));