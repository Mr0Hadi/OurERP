import { createPortal } from "react-dom";

import { useHeaderStore } from "@/shared/store/headerStore";

/**
 * دکمه‌های صفحه در هدرِ اپ، کنارِ عنوان (مثلاً «تاریخچه» در صفحه‌های جزئیات).
 *
 * پورتال به گرهی که `AppLayout` در `headerStore.actionsSlot` می‌گذارد؛ با خروج از صفحه
 * خودبه‌خود برداشته می‌شود. بیرون از `AppLayout` (یا پیش از ساخته‌شدنِ هدر) چیزی رندر نمی‌کند.
 */
export default function PageHeaderActions({ children }) {
  const slot = useHeaderStore((s) => s.actionsSlot);
  if (!slot || !children) return null;
  return createPortal(children, slot);
}
