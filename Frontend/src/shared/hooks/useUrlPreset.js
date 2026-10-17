import { useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * فیلترهای نشانی (`?paymentState=3&customerId=5`) — پیوندهای داشبورد و جدول‌های دیگر صفحه را
 * با *فقط* همان فیلتر باز می‌کنند (`applyPreset`: بقیه به پیش‌فرض).
 *
 * یک‌بار و **پیش از اولین درخواست** اعمال می‌شود (در initializerِ `useState`، نه افکت — افکت
 * بعد از اولین واکشی اجرا می‌شد و یک درخواستِ بی‌فایده با فیلترهای قبلی می‌رفت). همان الگوی
 * صفحه‌ی اقساط؛ تکرارش در StrictMode بی‌خطر است. بعد از آن فیلترها دستِ کاربر است.
 *
 * @param useStore استوری با اکشنِ `applyPreset` (مثلِ `accountingFilterStores` و `auditEventFilterStore`)
 * @param keys     نام‌هایی که از نشانی خوانده می‌شوند (همان نامِ پارامترِ سرور)؛ همه عددی‌اند
 *                 جز `search` و تاریخ‌ها (`fromDate`، `toDueDate`، … به شکلِ `YYYY-MM-DD`)
 * @param options.textKeys کلیدهای متنیِ دیگر که دست‌نخورده خوانده می‌شوند (مثلِ `entityType`)
 */
const DATE_KEY = /Date$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function useUrlPreset(useStore, keys, { textKeys = [] } = {}) {
  const [searchParams] = useSearchParams();

  useState(() => {
    const values = {};
    for (const key of textKeys) {
      const raw = searchParams.get(key);
      if (raw) values[key] = raw;
    }
    for (const key of keys) {
      const raw = searchParams.get(key);
      if (raw == null || raw === "") continue;
      if (key === "search") values[key] = raw;
      else if (DATE_KEY.test(key)) {
        if (ISO_DATE.test(raw)) values[key] = raw;
      } else if (Number.isFinite(Number(raw))) values[key] = Number(raw);
    }
    if (Object.keys(values).length > 0) useStore.getState().applyPreset(values);
  });
}

/** نشانیِ یک صفحه با فیلترهای از‌پیش‌انتخاب‌شده؛ مقدارِ خالی نوشته نمی‌شود. */
export function withFilters(path, filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== "" && value != null) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
