import { useFeatureFlagsQuery } from "../services/queries";

/**
 * آیا سوییچِ `key` روشن است؟ `key` خالی یعنی بی‌شرط (true). کلیدِ ناشناخته یا نیامده
 * خاموش حساب می‌شود — رفتارِ پیش‌فرضِ سرور هم همین است (مثلاً با چندانبارِ خاموش همه‌چیز
 * در انبارِ پیش‌فرض می‌رود).
 */
export function flagIsOn(flags, key) {
  if (key == null) return true;
  return flags?.[key] === true;
}

/**
 * سوییچ‌های عمومیِ قابلیت‌ها (`GetFeatureFlags`) — برای پنهان‌کردنِ منو، انتخاب‌گرِ انبار و
 * امثالِ آن. مثلِ `usePermission` فقط UX است؛ سرور خودش سوییچ را اعمال می‌کند.
 *
 * `value(key)` مقدارِ خام است (عدد یا متن برای تنظیم‌های غیرِ بولی).
 */
export function useFeatureFlags() {
  const { data, isPending, isError } = useFeatureFlagsQuery();

  return {
    isPending,
    isError,
    isOn: (key) => flagIsOn(data, key),
    value: (key) => data?.[key],
  };
}
