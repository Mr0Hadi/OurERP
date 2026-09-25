import axiosInstance from "@/shared/services/api/axios";

/**
 * حساب اشخاص — کنترلر `api/PartyAccount` (api-guide، بخش ۵ب).
 *
 * `GET GetPartyStatement`: گردشِ حسابِ **دقیقاً یک** مشتری یا تامین‌کننده،
 * با `fromDate`/`toDate` اختیاری. صفحه‌بندی ندارد، چون مانده‌ی جاری فقط
 * روی یک بازه‌ی پیوسته معنا دارد؛ بازه را با تاریخ کوچک کنید.
 *
 * مانده = بدهکار − بستانکار: مثبت یعنی طرف به ما بدهکار است، منفی یعنی ما
 * به او. خوانش برای مشتری و تامین‌کننده یکی است.
 */
export async function fetchPartyStatement({
  customerId,
  supplierId,
  fromDate,
  toDate,
}) {
  const { data } = await axiosInstance.get("/PartyAccount/GetPartyStatement", {
    params: {
      customerId: customerId || undefined,
      supplierId: supplierId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    },
  });
  return { ...data, entries: data?.entries || [] };
}
