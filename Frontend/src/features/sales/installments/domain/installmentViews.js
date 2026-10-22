import { SaleInstallmentStatusEnum } from "@/shared/domain/enums/saleInstallment";
import { todayIso } from "@/shared/lib/dateUtils";

/**
 * نماهای فهرستِ اقساط — همه روی `GetSaleInstallmentList` با فیلترِ سمتِ سرور؛ سند گفته
 * صفحه‌های «سررسیدگذشته» و «پیش‌رو» روی همین فهرست ساخته شوند و اندپوینتِ جدا ندارند.
 *
 * «سررسیدگذشته» همان `OVERDUE`ِ سرور است (مهلتِ ارفاق را سرور اعمال می‌کند)؛ «در انتظار» =
 * `PENDING`، یعنی هنوز دیر نشده. این دو با هم «پرداخت‌نشده» را می‌پوشانند.
 *
 * ⚠️ فیلترِ `status`ِ سرور تک‌مقداری است، پس نمای «همه‌ی پرداخت‌نشده‌ها» در یک فهرست ممکن نیست
 * (`frontend-requests.fa.md` بند ۲۵.۱). تا آن وقت پیش‌فرض «سررسیدگذشته» است.
 */
export const INSTALLMENT_VIEWS = Object.freeze({
  overdue: { label: "سررسیدگذشته", status: SaleInstallmentStatusEnum.OVERDUE },
  pending: { label: "در انتظار سررسید", status: SaleInstallmentStatusEnum.PENDING },
  upcoming: { label: "پیش‌رو", status: SaleInstallmentStatusEnum.PENDING, from: "today" },
  paid: { label: "پرداخت‌شده", status: SaleInstallmentStatusEnum.PAID },
  all: { label: "همه" },
});

export const DEFAULT_INSTALLMENT_VIEW = "overdue";

const later = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

/**
 * فیلترهای فرم (`view`، `customerId`، `fromDueDate`، `toDueDate`) → پارامترهای
 * `GetSaleInstallmentList`. بازه‌ی تاریخِ کاربر با بازه‌ی نما اشتراک گرفته می‌شود.
 */
export function installmentListParams({ view, customerId, fromDueDate, toDueDate }, today = todayIso()) {
  const preset = INSTALLMENT_VIEWS[view] ?? INSTALLMENT_VIEWS[DEFAULT_INSTALLMENT_VIEW];
  return {
    customerId,
    status: preset.status,
    fromDueDate: preset.from === "today" ? later(fromDueDate, today) : fromDueDate,
    toDueDate,
  };
}
