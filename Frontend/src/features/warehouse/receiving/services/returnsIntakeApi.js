// src/features/warehouse/receiving/services/returnsIntakeApi.js
import {
  allSalesReturns,
  SALES_RETURN_STATUSES,
  RETURN_ISSUE_TYPES,
  RETURN_ISSUE_TYPE_LABELS,
  RETURN_ISSUE_TYPE_STYLES,
} from "@/features/sales/services/returns/mockData";
import { computeReturnStatus, getSalesReturnIndex } from "@/features/sales/services/returns/api-mockData";
import { adjustProductsStock } from "@/features/warehouse/products/services/api-mockData";

export { RETURN_ISSUE_TYPES, RETURN_ISSUE_TYPE_LABELS, RETURN_ISSUE_TYPE_STYLES };

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * ثبت یک «دور» بررسی فیزیکی مرجوعی — دقیقاً مثل confirmReceiving در
 * خرید. verifiedQty هر قلم تجمعی است: اگر بخشی سری اول و بخشی سری
 * دوم برسد، هر دو روی هم جمع می‌شوند. تا وقتی که همه‌ی اقلام کامل
 * نرسیده باشند، مرجوعی همچنان در صف «بررسی و دریافت» باقی می‌ماند و
 * این تابع دوباره قابل صدا زدن است.
 *
 * موجودی انبار فقط به‌اندازه‌ی بخش «سالم» از تعداد دریافتی همین دور
 * افزایش می‌یابد — یعنی verifiedQtyThisRound منهای مجموع مشکلاتی که
 * برای همین دور گزارش شده (issues). کالایی که معیوب/آسیب‌دیده/اشتباه
 * گزارش شده، فرض بر این است که قابل فروش دوباره نیست و به موجودی
 * قابل‌فروش برنمی‌گردد.
 */
export async function confirmReturnInspection(returnId, inspectionData) {
  await delay(500);

  const index = getSalesReturnIndex(returnId);
  if (index === -1) throw new Error("مرجوعی یافت نشد");

  const salesReturn = allSalesReturns[index];
  if (salesReturn.status !== SALES_RETURN_STATUSES.PENDING_INSPECTION) {
    throw new Error("این مرجوعی قبلاً به‌طور کامل بررسی شده است");
  }

  const receivedDate = inspectionData.receivedDate || new Date().toISOString().slice(0, 10);
  const stockIncreases = [];

  const updatedItems = salesReturn.items.map((item) => {
    const inspected = inspectionData.inspectedItems.find((i) => i.lineId === item.lineId);
    if (!inspected) return item;

    const prevVerified = item.verifiedQty || 0;
    const remaining = Math.max(0, item.claimedQty - prevVerified);
    const thisRoundQty = Math.max(0, Math.min(Number(inspected.verifiedQtyThisRound) || 0, remaining));
    const newVerifiedQty = prevVerified + thisRoundQty;

    const reportedIssues = (inspected.issues || []).filter((i) => (Number(i.qty) || 0) > 0);
    const appended = reportedIssues.map((i) => ({
      id: generateId(),
      issueType: i.issueType || RETURN_ISSUE_TYPES.OTHER,
      qty: Number(i.qty) || 0,
      note: i.note || "",
      date: receivedDate,
    }));

    // بخش سالمِ همین دور: هرچه از تعداد دریافت‌شده‌ی همین دور که
    // مشکل‌دار گزارش نشده، سالم و قابل بازگشت به موجودیِ قابل‌فروش
    // انبار است.
    const issuesQtyThisRound = reportedIssues.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const healthyQtyThisRound = Math.max(0, thisRoundQty - issuesQtyThisRound);
    if (healthyQtyThisRound > 0) {
      stockIncreases.push({ productId: item.productId, delta: healthyQtyThisRound });
    }

    return {
      ...item,
      verifiedQty: newVerifiedQty,
      issues: appended.length > 0 ? [...(item.issues || []), ...appended] : item.issues,
    };
  });

  allSalesReturns[index] = {
    ...salesReturn,
    items: updatedItems,
    status: computeReturnStatus(updatedItems),
    receivingNote: inspectionData.receivingNote || "",
    receivedDate,
    transporterName: inspectionData.transporterName || "",
    transporterNationalId: inspectionData.transporterNationalId || "",
    vehiclePlate: inspectionData.vehiclePlate || "",
    updatedAt: new Date().toISOString(),
  };

  adjustProductsStock(stockIncreases);

  return allSalesReturns[index];
}