// src/features/warehouse/units/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import {
  generateProductUnits,
  markUnitsPrinted,
  resolveScannedCode,
  updateUnitsStatus,
} from "./api-mockData";
import { productKeys } from "@/features/warehouse/products/services/queryKeys";
import { productUnitKeys, pendingLabelKeys } from "./queryKeys";
import { usePrintLogStore } from "../store/printLogStore";

/**
 * اصلاح دستی وضعیت. چون موجودی کالا را هم تغییر می‌دهد، کش کالاها هم
 * باید باطل شود، نه فقط کش واحدها.
 */
export const useUpdateUnitsStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUnitsStatus,
    onSuccess: (_result, variables) => {
      toast.success(`وضعیت ${variables.unitIds.length} واحد ثبت شد`);
      queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
      queryClient.invalidateQueries({ queryKey: pendingLabelKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت وضعیت");
    },
  });
};

/**
 * تشخیص کد اسکن‌شده (واحد، کالا، یا هیچ‌کدام).
 *
 * عمداً mutation است نه query: اسکن یک «کار» است که کاربر انجام می‌دهد،
 * نه حالتی که از فیلترها مشتق شود — و نتیجه در onSuccess مصرف می‌شود،
 * بدون useEffectِ واکنشی.
 */
export const useResolveScannedCodeMutation = () =>
  useMutation({
    mutationFn: resolveScannedCode,
    onError: (error) => {
      toast.error(error?.message || "خطا در جست‌وجوی کد");
    },
  });

export const useGenerateProductUnitsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateProductUnits,
    onSuccess: (units) => {
      toast.success(`${units.length} برچسب ساخته شد`);
      queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
      queryClient.invalidateQueries({ queryKey: pendingLabelKeys.lists() });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ساخت برچسب‌ها");
    },
  });
};

/**
 * ثبت چاپ. کاغذ همان لحظه چاپ شده، پس شکستِ این درخواست یعنی داده و
 * واقعیت از هم جدا افتاده‌اند؛ چند بار تلاش خودکار می‌کنیم تا خطای
 * گذرا خودش حل شود، و اگر باز هم نشد صفحه یک هشدار ماندگار نشان
 * می‌دهد (usePrintLogStore) نه فقط یک توست.
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * تلاش دوباره‌ی صریح، به‌جای گزینه‌ی retry خودِ react-query.
 *
 * با retry: 2 روی این mutation، شکست نه دوباره تلاش می‌شد و نه به
 * onError می‌رسید — یعنی خطا کاملاً بی‌صدا گم می‌شد؛ دقیقاً همان چیزی
 * که این تغییر برای رفعش نوشته شده. اینجا حلقه دست خودمان است: چند
 * بار تلاش می‌کنیم و اگر همه شکست خورد، خطا حتماً بالا می‌رود.
 */
async function withRetry(run, { attempts = 3, baseDelayMs = 500 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await wait(baseDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}

export const useMarkUnitsPrintedMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // ورودی خودِ واحدهاست نه فقط شناسه‌ها، تا در صورت شکست بشود کدشان
    // را به انباردار نشان داد.
    mutationFn: (units) =>
      withRetry(() => markUnitsPrinted(units.map((unit) => unit.id))),
    onSuccess: (_result, units) => {
      queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
      usePrintLogStore.getState().resolveUnits(units.map((unit) => unit.id));
    },
    // سیاست جبران همین‌جا می‌ماند و نه در صفحه: هر کسی این mutation را
    // صدا بزند، شکستش نباید بی‌صدا گم شود.
    onError: (error, units) => {
      usePrintLogStore.getState().addUnrecorded(units);
      toast.error(error?.message || "ثبت وضعیت چاپ انجام نشد");
    },
  });
};
