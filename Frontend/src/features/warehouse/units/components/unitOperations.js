import { Ban, PackageCheck, Printer, ShieldAlert, Undo2 } from "lucide-react";

import {
  LABELABLE_STATUSES,
  UnitActionEnum,
  canApply,
  purchaseReturnRouteOf,
} from "../domain/unitVocabulary";

export const NO_PERMISSION_HINT = "برای این کار دسترسیِ «مدیریت دانه‌ها» لازم است";

const ACTIONS = [
  { action: UnitActionEnum.QUARANTINE, label: "انتقال به قرنطینه", icon: ShieldAlert },
  { action: UnitActionEnum.RELEASE, label: "بازگشت به موجودی", icon: PackageCheck },
  { action: UnitActionEnum.SCRAP, label: "اسقاط", icon: Ban, destructive: true },
];

/**
 * کارهای ممکن روی یک یا چند دانه — یک فهرست برای جزئیاتِ دانه و نوارِ
 * انتخاب، تا تکی و دسته‌ای دقیقاً یک رفتار داشته باشند.
 *
 * هر کار فقط وقتی می‌آید که دستِ‌کم یک دانه‌ی انتخاب‌شده برایش مجاز باشد؛
 * `count` می‌گوید روی چندتا اعمال می‌شود. کاری که دیده می‌شود ولی الان
 * نمی‌شود (دسترسی، چند خریدِ مختلف) `disabled` است با `hint`ِ دلیلش — پنهان
 * نمی‌شود تا کاربر بداند چنین راهی هست.
 *
 * @returns `[{ key, kind: "print" | "action" | "return", label, icon, count,
 *            destructive?, action?, route?, disabled, hint? }]`
 */
export function unitOperationsFor(units, { canManage }) {
  const operations = [];

  const printable = units.filter((unit) => LABELABLE_STATUSES.includes(unit.status));
  if (printable.length > 0) {
    const reprint = units.length === 1 && units[0].printCount > 0;
    operations.push({
      key: "print",
      kind: "print",
      label: reprint ? "چاپ دوباره‌ی برچسب" : "چاپ برچسب",
      icon: Printer,
      count: printable.length,
      disabled: false,
    });
  }

  ACTIONS.forEach(({ action, label, icon, destructive }) => {
    const count = units.filter((unit) => canApply(unit, action)).length;
    if (count === 0) return;
    operations.push({
      key: `action-${action}`,
      kind: "action",
      action,
      label,
      icon,
      destructive,
      count,
      disabled: !canManage,
      hint: canManage ? undefined : NO_PERMISSION_HINT,
    });
  });

  // عودت فقط برای قرنطینه، و در یک مرجوعی فقط دانه‌های یک خرید.
  const quarantined = units.filter((unit) => canApply(unit, UnitActionEnum.RELEASE));
  if (quarantined.length > 0) {
    const routed = quarantined.map(purchaseReturnRouteOf).filter(Boolean);
    const routes = new Set(routed);
    const withRoute = routed.length;
    const route = routes.size === 1 ? routed[0] : null;
    operations.push({
      key: "return",
      kind: "return",
      label: "عودت به تامین‌کننده",
      icon: Undo2,
      count: withRoute,
      route,
      disabled: !route,
      hint: route
        ? undefined
        : withRoute === 0
          ? "این دانه با خرید وارد نشده و تامین‌کننده‌ای ندارد"
          : "دانه‌های انتخاب‌شده از چند خریدِ مختلف‌اند؛ هر بار دانه‌های یک خرید را انتخاب کنید",
    });
  }

  return operations;
}
