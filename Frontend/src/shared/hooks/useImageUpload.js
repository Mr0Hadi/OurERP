// src/shared/hooks/useImageUpload.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { deleteImages, objectKeyOf, uploadImage } from "@/shared/services/files/client";
import { validateImageFile } from "@/shared/services/files/fileConstraints";
import { isDisplayableUrl } from "@/shared/services/files/objectKey";
import { useImageUrlQuery, useSeedImageUrl } from "@/shared/services/files/queries";

/**
 * تکْ‌تصویرِ یک موجودیت (محصول، مشتری، تامین‌کننده، …) — همان گردش‌کارِ
 * دو مرحله‌ایِ بخش ۱۷ سند، یک‌بار نوشته شده برای همه‌ی فرم‌ها.
 *
 * مسئله‌هایی که حل می‌کند و در هر فرم تکرار می‌شد:
 *
 * ۱. **چه چیزی در payload می‌رود.** سرور در فیلد `imageUrl` منتظرِ
 *    *ObjectKey* است، نه URL و نه base64. هوک `imageKeyPayload` را
 *    می‌دهد: کلید، یا `null` وقتی کاربر تصویر را برداشته.
 * ۲. **پیش‌نمایش قبل از ذخیره.** فایل بلافاصله آپلود می‌شود و تا وقتی
 *    پاسخ نیامده، `URL.createObjectURL` نشان داده می‌شود — نه انتظارِ
 *    سفید، نه base64ِ سنگین در state.
 * ۳. **فایلِ یتیم.** سرور تصویرِ قبلی را خودکار پاک نمی‌کند. هوک هر
 *    کلیدی را که در این نشست بی‌صاحب شده نگه می‌دارد و با `commit()`
 *    (بعد از ذخیره‌ی موفق) یا `discard()` (انصراف) پاکشان می‌کند.
 * ۴. **رقابتِ آپلودها.** اگر کاربر پشتِ هم دو فایل انتخاب کند، آپلودِ
 *    قبلی abort می‌شود تا پاسخِ دیرآمده روی انتخابِ جدید ننشیند.
 *
 * @param folder        `ImageFolderEnum`
 * @param initialKey    `imageKey` موجودیت در حالت ویرایش
 * @param initialUrl    `imageUrl` امضاشده‌ی همان موجودیت (فقط برای نمایش)
 * @param deleteOrphans پاک‌کردنِ فایل‌های بی‌صاحب (پیش‌فرض روشن)
 * @param notifyError   toastِ خطا (اگر خطا را کنارِ فیلد نشان می‌دهید خاموشش کنید)
 */
export function useImageUpload({
  folder,
  initialKey = null,
  initialUrl = null,
  deleteOrphans = true,
  notifyError = true,
} = {}) {
  const seedImageUrl = useSeedImageUrl();

  const [objectKey, setObjectKey] = useState(() => objectKeyOf(initialKey));
  const [remoteUrl, setRemoteUrl] = useState(initialUrl || null);
  const [localPreview, setLocalPreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  /**
   * کلیدی که واقعاً روی سرور ذخیره شده — مبنای «عوض شده یا نه».
   * state است و نه ref، چون `isDirty` در همان رندر خوانده می‌شود.
   */
  const [baselineKey, setBaselineKey] = useState(() => objectKeyOf(initialKey));
  /** هرچه در این نشست آپلود شده؛ هرکدام که آخرش انتخاب نشود یتیم است. */
  const sessionKeysRef = useRef(new Set());
  const abortRef = useRef(null);
  const localPreviewRef = useRef(null);

  const revokeLocalPreview = useCallback(() => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
  }, []);

  // فقط unmount؛ آبجکت‌URLها و آپلودِ نیمه‌کاره نباید جا بمانند.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    },
    []
  );

  const fail = useCallback(
    (message) => {
      setStatus("error");
      setError(message);
      setProgress(0);
      if (notifyError) toast.error(message);
    },
    [notifyError]
  );

  /**
   * ورودی می‌تواند خودِ `File` باشد یا `event` ورودیِ فایل — هر دو شکل در
   * فرم‌های فعلی هست و هوک نباید مجبورشان کند یکی را انتخاب کنند.
   */
  const selectFile = useCallback(
    async (input) => {
      const file = input?.target?.files?.[0] ?? input;
      // خالی‌کردنِ input تا انتخابِ دوباره‌ی همان فایل هم رویداد بدهد.
      if (input?.target) input.target.value = "";
      if (!file) return null;

      const validationError = validateImageFile(file);
      if (validationError) {
        fail(validationError);
        return null;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      revokeLocalPreview();
      const preview = URL.createObjectURL(file);
      localPreviewRef.current = preview;
      setLocalPreview(preview);
      setRemoteUrl(null);
      setStatus("uploading");
      setProgress(0);
      setError(null);

      try {
        const uploaded = await uploadImage({
          file,
          folder,
          signal: controller.signal,
          onProgress: setProgress,
        });

        // انتخابِ بعدیِ کاربر جلو زده؛ این پاسخ دیگر مالِ صفحه نیست.
        if (controller.signal.aborted) return null;

        sessionKeysRef.current.add(uploaded.objectKey);
        setObjectKey(uploaded.objectKey);
        setRemoteUrl(uploaded.url || null);
        seedImageUrl(uploaded.objectKey, uploaded.url);
        setStatus("idle");
        setProgress(100);
        return uploaded;
      } catch (uploadError) {
        if (controller.signal.aborted) return null;
        revokeLocalPreview();
        setLocalPreview(null);
        fail(uploadError?.message || "خطا در بارگذاری تصویر.");
        return null;
      }
    },
    [fail, folder, revokeLocalPreview, seedImageUrl]
  );

  /**
   * برداشتنِ تصویر. فایل *همین‌جا* از باکت پاک نمی‌شود: تا وقتی کاربر فرم
   * را ذخیره نکرده، موجودیت هنوز به کلیدِ قبلی اشاره می‌کند و پاک‌کردنش
   * یعنی عکسِ شکسته در صفحه‌ی جزئیات.
   */
  const remove = useCallback(() => {
    abortRef.current?.abort();
    revokeLocalPreview();
    setLocalPreview(null);
    setObjectKey(null);
    setRemoteUrl(null);
    setStatus("idle");
    setProgress(0);
    setError(null);
  }, [revokeLocalPreview]);

  /** برگرداندنِ هوک به یک مقدارِ سرور — مثلاً وقتی داده‌ی ویرایش رسید. */
  const reset = useCallback(
    ({ key = null, url = null } = {}) => {
      abortRef.current?.abort();
      revokeLocalPreview();
      setLocalPreview(null);
      const normalized = objectKeyOf(key);
      setBaselineKey(normalized);
      sessionKeysRef.current = new Set();
      setObjectKey(normalized);
      setRemoteUrl(url || null);
      setStatus("idle");
      setProgress(0);
      setError(null);
    },
    [revokeLocalPreview]
  );

  /**
   * بعد از ذخیره‌ی *موفقِ* موجودیت صدا زده شود: از این لحظه کلیدِ فعلی
   * مبناست و هر کلیدِ دیگری (تصویرِ قبلیِ سرور یا آپلودهای میانی) یتیم است.
   */
  const commit = useCallback(() => {
    const orphans = new Set(sessionKeysRef.current);
    if (baselineKey && baselineKey !== objectKey) orphans.add(baselineKey);
    if (objectKey) orphans.delete(objectKey);

    setBaselineKey(objectKey);
    sessionKeysRef.current = objectKey ? new Set([objectKey]) : new Set();

    if (deleteOrphans && orphans.size) deleteImages([...orphans]);
  }, [baselineKey, deleteOrphans, objectKey]);

  /**
   * انصراف از فرم: هرچه در این نشست آپلود شده و هرگز ذخیره نشده فقط
   * زباله است. کلیدِ اصلیِ موجودیت دست‌نخورده می‌ماند.
   */
  const discard = useCallback(() => {
    const orphans = [...sessionKeysRef.current].filter((key) => key !== baselineKey);
    sessionKeysRef.current = baselineKey ? new Set([baselineKey]) : new Set();

    if (deleteOrphans && orphans.length) deleteImages(orphans);
  }, [baselineKey, deleteOrphans]);

  const isUploading = status === "uploading";

  /**
   * موجودیت ممکن است فقط `imageKey` بدهد، یا `imageUrl`ش منقضی شده باشد،
   * یا (در mock) اصلاً کلیدِ خام در `imageUrl` نشسته باشد. در هر سه حالت
   * آدرسِ قابل نمایش را باید خودمان بگیریم — وگرنه فرمِ ویرایش «بدون
   * تصویر» نشان می‌دهد در حالی که تصویر وجود دارد.
   */
  const remoteIsDisplayable = isDisplayableUrl(remoteUrl);
  const { data: signedUrl } = useImageUrlQuery(objectKey, {
    enabled: Boolean(objectKey) && !localPreview && !remoteIsDisplayable,
  });

  return useMemo(
    () => ({
      /** آدرسِ نمایش — تا آمدنِ پاسخ فایلِ محلی، بعدش امضای سرور. */
      previewUrl:
        localPreview || (remoteIsDisplayable ? remoteUrl : signedUrl) || null,
      objectKey,
      /**
       * چیزی که باید در `imageUrl` دستور Create/Update برود. `null` یعنی
       * «تصویر را پاک کن» — همان قراردادِ سند.
       */
      imageKeyPayload: objectKey ?? null,
      status,
      error,
      progress,
      /** فرم تا پایانِ آپلود نباید submit شود؛ کلید هنوز وجود ندارد. */
      isUploading,
      isDirty: objectKey !== baselineKey,
      selectFile,
      remove,
      reset,
      commit,
      discard,
    }),
    [
      baselineKey,
      commit,
      discard,
      error,
      isUploading,
      localPreview,
      objectKey,
      progress,
      remoteIsDisplayable,
      remoteUrl,
      signedUrl,
      remove,
      reset,
      selectFile,
      status,
    ]
  );
}

export default useImageUpload;
