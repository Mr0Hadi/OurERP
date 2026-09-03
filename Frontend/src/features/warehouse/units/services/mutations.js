// src/features/warehouse/units/services/mutations.js
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { resolveScannedCode } from "./api-v1";

/**
 * تشخیص کد اسکن‌شده (دانه، کالا، یا هیچ‌کدام).
 *
 * عمداً mutation است نه query: اسکن یک «کار» است که کاربر انجام می‌دهد،
 * نه حالتی که از فیلترها مشتق شود — و نتیجه در onSuccess مصرف می‌شود،
 * بدون useEffectِ واکنشی.
 *
 * تنها mutationِ این فیچر است: هر نوشتنِ دیگری روی دانه‌ها (ساخت، ثبتِ
 * چاپ، تغییرِ وضعیت) معادلی در بکند ندارد و از فرانت حذف شد.
 */
export const useResolveScannedCodeMutation = () =>
  useMutation({
    mutationFn: resolveScannedCode,
    onError: (error) => {
      toast.error(error?.message || "خطا در جست‌وجوی کد");
    },
  });
