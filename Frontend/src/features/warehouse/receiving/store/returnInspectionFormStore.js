// src/features/warehouse/receiving/store/returnInspectionFormStore.js
import { create } from "zustand";

const EMPTY_INSPECTION = {
  returnId: "",
  returnNumber: "",
  customerName: "",
  saleInvoiceNumber: "",
  reason: "",
  status: "",
  items: [],
  receivingNote: "",
  receivedDate: new Date().toISOString().slice(0, 10),
  transporterName: "",
  transporterNationalId: "",
  vehiclePlate: "",
};

const useReturnInspectionFormStore = create((set, get) => ({
  formData: { ...EMPTY_INSPECTION },
  initializedForId: null,

  setFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  setInspectionItems: (items) => set((state) => ({ formData: { ...state.formData, items } })),

  initializeFromReturn: (salesReturn) => {
    const { initializedForId } = get();
    const version = `${salesReturn.id}:${salesReturn.updatedAt}`;
    if (initializedForId === version) return;

    const items = (salesReturn.items || [])
      .map((item) => {
        const alreadyVerifiedQty = item.verifiedQty || 0;
        const remainingQty = Math.max(0, item.claimedQty - alreadyVerifiedQty);
        return {
          lineId: item.lineId,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          claims: item.claims || [],
          claimedQty: item.claimedQty,
          alreadyVerifiedQty,
          remainingQty,
          // پیش‌فرض: فرض بر این است که کل باقیمانده همین الان رسیده؛
          // انباردار در صورت نیاز آن را کم می‌کند.
          verifiedQtyThisRound: remainingQty,
          issues: [],
        };
      })
      // اقلامی که قبلاً به‌طور کامل رسیده‌اند، دیگر چیزی برای این دور ندارند
      .filter((item) => item.remainingQty > 0);

    set({
      initializedForId: version,
      formData: {
        returnId: salesReturn.id,
        returnNumber: salesReturn.returnNumber,
        customerName: salesReturn.customerName,
        saleInvoiceNumber: salesReturn.saleInvoiceNumber,
        reason: salesReturn.reason,
        status: salesReturn.status,
        items,
        receivingNote: "",
        receivedDate: new Date().toISOString().slice(0, 10),
        transporterName: "",
        transporterNationalId: "",
        vehiclePlate: "",
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_INSPECTION }, initializedForId: null }),
}));

export default useReturnInspectionFormStore;