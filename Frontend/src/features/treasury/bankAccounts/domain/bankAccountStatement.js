import { BankAccountMovementKindEnum } from "@/shared/domain/enums/bankAccount";
import { todayIso } from "@/shared/lib/dateUtils";

/**
 * گردشِ حساب صفحه‌بندی ندارد و سرور می‌گوید با تاریخ محدود شود؛ پیش‌فرض ۳۰ روزِ اخیر است و «از ابتدا» یک کلیک.
 */
export const STATEMENT_DEFAULT_DAYS = 30;

export function defaultStatementRange(today = new Date()) {
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - STATEMENT_DEFAULT_DAYS);
  return { fromDate: todayIso(from), toDate: "" };
}

/** ردیفِ انتقال (ورودی یا خروجی) — فقط این‌ها از همین صفحه ابطال می‌شوند. */
export const isTransferMovement = (row) =>
  row.kind === BankAccountMovementKindEnum.TRANSFER_IN || row.kind === BankAccountMovementKindEnum.TRANSFER_OUT;
