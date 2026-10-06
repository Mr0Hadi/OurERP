import { SaleInstallmentStatusEnum } from "@/shared/domain/enums/saleInstallment";
import { todayIso } from "@/shared/lib/dateUtils";

/**
 * نماهای فهرستِ اقساط — همه روی `GetSaleInstallmentList` با فیلترِ سمتِ سرور؛ سند گفته
 * صفحه‌های «سررسیدگذشته» و «پیش‌رو» روی همین فهرست ساخته شوند و اندپوینتِ جدا ندارند.
 *
 * «سررسیدگذشته» = پرداخت‌نشده با سررسیدِ پیش از امروز (همان `installmentDisplayStatus`)؛
 * «پیش‌رو» = پرداخت‌نشده از امروز به بعد. این دو با هم «پرداخت‌نشده» را کامل می‌پوشانند.
 *
 * ⚠️ فیلترِ وضعیتِ سرور تک‌مقداری است و فقط `PENDING` را می‌گیرد؛ اگر روزی سرور `OVERDUE`
 * بنویسد، آن ردیف‌ها باید جدا خوانده شوند (`frontend-requests.fa.md` بند ۱۷.۴).
 */
export const INSTALLMENT_VIEWS = Object.freeze({
  unpaid: { label: "پرداخت‌نشده", status: SaleInstallmentStatusEnum.PENDING },
  overdue: { label: "سررسیدگذشته", status: SaleInstallmentStatusEnum.PENDING, before: "today" },
  upcoming: { label: "پیش‌رو", status: SaleInstallmentStatusEnum.PENDING, from: "today" },
  paid: { label: "پرداخت‌شده", status: SaleInstallmentStatusEnum.PAID },
  all: { label: "همه" },
});

export const DEFAULT_INSTALLMENT_VIEW = "unpaid";

/** "YYYY-MM-DD" ± چند روز، به وقتِ محلی. */
export function addDaysIso(iso, days) {
  const [year, month, day] = String(iso).slice(0, 10).split("-").map(Number);
  return todayIso(new Date(year, month - 1, day + days));
}

const later = (a, b) => (!a ? b : !b ? a : a > b ? a : b);
const earlier = (a, b) => (!a ? b : !b ? a : a < b ? a : b);

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
    toDueDate: preset.before === "today" ? earlier(toDueDate, addDaysIso(today, -1)) : toDueDate,
  };
}
