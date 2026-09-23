import { useMemo } from "react";
import { useMyPermissionsQuery } from "../services/queries";

/**
 * آیا `names` شرطِ `required` را برآورده می‌کند؟
 *
 * `required` یکی از این‌هاست:
 *   - خالی (`null`/`undefined`) → بدون شرط، همیشه true
 *   - یک نام (`"SaleView"`)
 *   - آرایه‌ای از نام‌ها → *هرکدام* کافی است (any-of)
 *
 * شرط‌ها روی `name` هستند نه عدد: نام‌ها قراردادِ خوانا و ثابتِ سرورند.
 */
export function satisfies(names, required) {
  if (required == null) return true;
  if (Array.isArray(required)) {
    return required.length === 0 || required.some((name) => names.has(name));
  }
  return names.has(required);
}

/**
 * `can` / `canAny` روی دسترسی‌های کاربرِ واردشده.
 *
 * ⚠️ تا وقتی `isPending` است، `can()` برای همه‌چیز false می‌دهد. منو و
 * گاردِ مسیر باید این حالت را از «دسترسی ندارد» جدا کنند، وگرنه کاربر
 * برای لحظه‌ای منوی خالی یا صفحه‌ی «دسترسی ندارید» می‌بیند.
 *
 * این فقط UX است؛ بررسیِ واقعی روی خودِ endpoint در سرور است.
 */
export function usePermission() {
  const { data, isPending, isError } = useMyPermissionsQuery();

  const names = useMemo(
    () => new Set(data?.permissionNames ?? []),
    [data],
  );

  return {
    isPending,
    isError,
    names,
    can: (required) => satisfies(names, required),
    canAny: (...permissions) => permissions.some((p) => names.has(p)),
  };
}
