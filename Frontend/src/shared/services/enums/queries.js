import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import axiosInstance from "@/shared/services/api/axios";
import { PURCHASE_STATUS_LABELS } from "@/shared/domain/enums/purchaseStatus";
import { SALE_STATUS_LABELS } from "@/shared/domain/enums/saleStatus";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";

/**
 * برچسبِ فارسیِ enumها از خودِ بکند (`[Description]`ِ هر عضو) —
 * `GET api/Enum/GetEnums` (بندِ ۱۰ سندِ درخواست‌ها).
 *
 * شماره‌ی اعضا در `shared/domain/enums/*` می‌ماند، چون منطقِ فرانت (قاعده‌های
 * وضعیت، جهتِ پرداخت) به آن‌ها وابسته است و یکی‌بودنشان با بکند در
 * `api-guide` بخش ۱۵ تضمین شده؛ ولی *متنی* که کاربر می‌بیند از سرور می‌آید
 * تا یک برچسب دو جا نوشته نشود.
 *
 * تا endpoint ساخته نشده (۴۰۴) یا اگر نیامد، برچسب‌های محلی جایش را می‌گیرند —
 * صفحه هیچ‌وقت منتظرِ این درخواست نمی‌ماند.
 */
async function fetchEnums() {
  const { data } = await axiosInstance.get("/Enum/GetEnums");
  return data;
}

function useEnumsQuery() {
  return useQuery({
    queryKey: ["enums"],
    queryFn: fetchEnums,
    // enumها فقط با انتشارِ نسخه‌ی تازه‌ی بکند عوض می‌شوند.
    staleTime: Infinity,
    gcTime: Infinity,
    // ۴۰۴ (endpoint هنوز نیست) با هر mountِ یک badge دوباره خواسته نشود.
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * `{ [value]: label }` برای یک enum (نامِ کلاسِ بکند، مثلِ `"PurchaseStatusEnum"`):
 * برچسبِ سرور روی برچسبِ محلی.
 *
 * پاسخِ مورد انتظار: `{ PurchaseStatusEnum: [{ value, name, description }], ... }`.
 */
function useEnumLabels(enumName, fallback) {
  const { data } = useEnumsQuery();
  const members = data?.[enumName];
  return useMemo(() => {
    if (!Array.isArray(members) || members.length === 0) return fallback;
    const fromServer = Object.fromEntries(
      members.filter((member) => member?.description).map((member) => [member.value, member.description]),
    );
    return { ...fallback, ...fromServer };
  }, [members, fallback]);
}

/** برچسب‌های enumهای خرید و فروش — سرور، با برچسبِ محلی به‌جای نیامده‌ها. */
export const usePurchaseStatusLabels = () => useEnumLabels("PurchaseStatusEnum", PURCHASE_STATUS_LABELS);
export const useSaleStatusLabels = () => useEnumLabels("SalesStatusEnum", SALE_STATUS_LABELS);
export const usePaymentTypeLabels = () => useEnumLabels("PaymentTypeEnum", PAYMENT_TYPE_LABELS);
