// src/features/warehouse/units/store/printLogStore.js
import { create } from "zustand";

/**
 * برچسب‌هایی که از پرینتر بیرون آمده‌اند ولی ثبتشان در سیستم شکست خورده.
 *
 * چاپ و ثبتِ چاپ دو کار جدا هستند: کاغذ همان لحظه چاپ می‌شود، ولی ثبتش
 * یک درخواست است که می‌تواند شکست بخورد. اگر فقط یک توست خطا نشان
 * بدهیم، چند ثانیه بعد محو می‌شود و آن واحدها برای همیشه «چاپ‌نشده»
 * می‌مانند — یعنی انباردار دوباره برایشان برچسب می‌زند در حالی که
 * برچسبشان روی جنس چسبیده است.
 *
 * پس تا وقتی ثبت نشده، به‌صورت یک هشدارِ ماندگار و قابل تلاش دوباره
 * روی صفحه می‌ماند.
 *
 * عمداً persist ندارد: داده‌های این برنامه هنوز mock و در حافظه‌اند و
 * با رفرش صفحه از نو ساخته می‌شوند، پس نگه‌داشتن شناسه‌های قدیمی در
 * localStorage فقط تلاشِ دوباره‌ی بی‌اثر تولید می‌کرد. با بک‌اند واقعی
 * این صف باید سمت سرور آشتی داده شود.
 */
export const usePrintLogStore = create((set) => ({
  unrecorded: [],

  addUnrecorded: (units) =>
    set((state) => ({
      unrecorded: [
        ...state.unrecorded,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          units: units.map((unit) => ({
            id: unit.id,
            unitCode: unit.unitCode,
          })),
          failedAt: new Date().toISOString(),
        },
      ],
    })),

  removeUnrecorded: (batchId) =>
    set((state) => ({
      unrecorded: state.unrecorded.filter((batch) => batch.id !== batchId),
    })),

  /**
   * هر دسته‌ای که همه‌ی واحدهایش الان با موفقیت ثبت شده‌اند، از صف
   * بیرون می‌رود — فرقی نمی‌کند تلاش دوباره از دکمه‌ی هشدار بوده باشد
   * یا چاپ دوباره‌ی همان واحدها از جای دیگر.
   */
  resolveUnits: (unitIds) =>
    set((state) => {
      const done = new Set(unitIds);
      return {
        unrecorded: state.unrecorded.filter(
          (batch) => !batch.units.every((unit) => done.has(unit.id)),
        ),
      };
    }),
}));
