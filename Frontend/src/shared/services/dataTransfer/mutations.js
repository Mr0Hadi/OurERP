import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { getErrorMessage } from "@/shared/lib/errorMessage";
import { saveBlobAs } from "@/shared/lib/saveBlob";
import { idempotencyKeyFor } from "@/shared/services/api/contract";

import { commitImport, downloadImportTemplate, exportResource, previewImport } from "./api-v1";

/** خروجی گرفتن و ذخیره‌ی فایل. */
export function useExportMutation() {
  return useMutation({
    mutationFn: exportResource,
    onSuccess: ({ blob, fileName }) => {
      saveBlobAs(blob, fileName);
      toast.success("فایل خروجی آماده شد.");
    },
    onError: (error) => toast.error(getErrorMessage(error, "گرفتنِ خروجی انجام نشد")),
  });
}

export function useImportTemplateMutation() {
  return useMutation({
    mutationFn: downloadImportTemplate,
    onSuccess: ({ blob, fileName }) => saveBlobAs(blob, fileName),
    onError: (error) => toast.error(getErrorMessage(error, "دریافتِ فایلِ نمونه انجام نشد")),
  });
}

/** پیش‌نمایش؛ خطا را خودِ دیالوگ نشان می‌دهد. */
export function usePreviewImportMutation() {
  return useMutation({ mutationFn: previewImport });
}

/**
 * ثبتِ نهایی. کلیدِ ایدمپوتنسی به «همین فایل + همین تصمیم» گره خورده تا
 * دوبار کلیک یا retry یک فایل را دوبار وارد نکند.
 *
 * @param {object} options
 * @param {readonly unknown[]} [options.invalidateKey] کلیدِ کشِ لیستِ همان جدول (مثلاً `customerKeys.all`)
 */
export function useCommitImportMutation({ invalidateKey } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resource, file, skipInvalidRows }) =>
      commitImport({
        resource,
        file,
        skipInvalidRows,
        idempotencyKey: idempotencyKeyFor(
          { resource, name: file.name, size: file.size, modified: file.lastModified, skipInvalidRows },
          "data-import",
        ),
      }),
    onSuccess: (result) => {
      toast.success(`${result?.importedRows ?? 0} ردیف وارد شد.`);
      if (invalidateKey) queryClient.invalidateQueries({ queryKey: invalidateKey });
    },
  });
}
