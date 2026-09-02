// src/shared/hooks/useFileUploadList.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { deleteImages, objectKeyOf, uploadImage } from "@/shared/services/files/client";
import {
  DOCUMENT_ACCEPT,
  IMAGE_ACCEPT,
  validateDocumentFile,
  validateImageFile,
} from "@/shared/services/files/fileConstraints";
import { useSeedImageUrl } from "@/shared/services/files/queries";

/**
 * چند فایلِ یک *سند*، نه یک موجودیت — ضمیمه‌ی فاکتور/پیش‌فاکتور
 * (`attachments` در خرید/فروش) و تصاویر رسید کالا در `ReceivePurchase`
 * (بخش ۱۷ سند).
 *
 * چرا جدا از `useImageUpload` و نه یک هوکِ عمومی با `multiple`: قراردادِ
 * سرور اینجا واقعاً فرق دارد. آن‌جا یک *کلید* در `imageUrl` می‌نشیند و
 * جایگزینی معنی دارد؛ این‌جا یک *آرایه* از
 * `{ objectKey, fileName, note }` فرستاده می‌شود، هر قلم یادداشتِ خودش را
 * دارد («کارتن آسیب‌دیده») و چیزی جایگزین چیزی نمی‌شود. یک هوکِ دوکاره
 * می‌شد یک مشت `if (multiple)`.
 *
 * هر فایل چرخه‌ی مستقلِ خودش را دارد: یکی می‌تواند شکست بخورد و دوباره
 * تلاش شود بی‌آنکه بقیه دست بخورند.
 */

let nextLocalId = 0;
const localId = () => `file-${++nextLocalId}`;

/** شکلِ سرور → شکلِ داخلیِ لیست. */
function itemFromServer(entry) {
  const key = objectKeyOf(entry?.objectKey ?? entry?.imageKey ?? null);
  return {
    id: localId(),
    objectKey: key,
    url: entry?.url ?? entry?.imageUrl ?? null,
    localPreview: null,
    fileName: entry?.fileName ?? "",
    note: entry?.note ?? "",
    status: "ready", // ready | uploading | error
    progress: 100,
    error: null,
    file: null,
  };
}

/**
 * @param allowDocuments  «سند» به‌جای «تصویر»: PDF هم پذیرفته می‌شود
 *   (ضمیمه‌ی فاکتور/پیش‌فاکتور). پیش‌فرض خاموش است تا جایی که واقعاً
 *   عکس می‌خواهد — عکسِ نوبتِ دریافت — PDF نگیرد.
 */
export function useFileUploadList({
  folder,
  initialItems = [],
  maxCount = 10,
  deleteOrphans = true,
  notifyError = true,
  allowDocuments = false,
} = {}) {
  const validateFile = allowDocuments ? validateDocumentFile : validateImageFile;
  const accept = allowDocuments ? DOCUMENT_ACCEPT : IMAGE_ACCEPT;
  // پیام‌ها با همان چیزی حرف بزنند که کاربر می‌بیند: «فایل» وقتی PDF هم
  // مجاز است، «تصویر» وقتی فقط عکس.
  const noun = allowDocuments ? "فایل" : "تصویر";
  const seedImageUrl = useSeedImageUrl();

  const [items, setItems] = useState(() => initialItems.map(itemFromServer));

  /**
   * آینه‌ی همیشه‌به‌روزِ `items`.
   *
   * `addFiles` باید *همان لحظه* بداند چند قلم در لیست هست (برای سقفِ
   * تعداد) و بلافاصله آپلود را شروع کند. انجامِ این کارها داخلِ
   * updaterِ `setItems` جواب نمی‌دهد: React آن تابع را خالص فرض می‌کند و
   * در StrictMode دوبار صدا می‌زند — یعنی هر فایل دوبار آپلود می‌شد.
   */
  const itemsRef = useRef(items);

  const updateItems = useCallback((updater) => {
    const next = typeof updater === "function" ? updater(itemsRef.current) : updater;
    itemsRef.current = next;
    setItems(next);
  }, []);

  /** کلیدهایی که موقعِ باز شدنِ فرم روی سرور بودند. */
  const baselineKeysRef = useRef(
    new Set(initialItems.map((entry) => objectKeyOf(entry?.objectKey ?? entry?.imageKey)).filter(Boolean))
  );
  const sessionKeysRef = useRef(new Set());
  const previewsRef = useRef(new Map());

  const revokePreview = useCallback((id) => {
    const url = previewsRef.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      previewsRef.current.delete(id);
    }
  }, []);

  useEffect(
    () => () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewsRef.current.clear();
    },
    []
  );

  const patchItem = useCallback(
    (id, patch) => {
      updateItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item))
      );
    },
    [updateItems]
  );

  const startUpload = useCallback(
    async (id, file) => {
      patchItem(id, { status: "uploading", progress: 0, error: null });

      try {
        const uploaded = await uploadImage({
          file,
          folder,
          onProgress: (percent) => patchItem(id, { progress: percent }),
        });

        sessionKeysRef.current.add(uploaded.objectKey);
        seedImageUrl(uploaded.objectKey, uploaded.url);
        patchItem(id, {
          objectKey: uploaded.objectKey,
          url: uploaded.url || null,
          status: "ready",
          progress: 100,
          // نامِ فایلِ کاربر نگه داشته می‌شود چون در payload می‌رود؛ کلید
          // را سرور می‌سازد و چیزی از نام در آن نیست.
          fileName: uploaded.fileName || file.name,
        });
      } catch (uploadError) {
        const message = uploadError?.message || `خطا در بارگذاری ${noun}.`;
        patchItem(id, { status: "error", progress: 0, error: message });
        if (notifyError) toast.error(message);
      }
    },
    [folder, notifyError, noun, patchItem, seedImageUrl]
  );

  /** ورودی: `FileList`، آرایه‌ای از `File`، یا رویدادِ input. */
  const addFiles = useCallback(
    (input) => {
      // ترتیب مهم است: `FileList` یک نمای *زنده* از خودِ input است، پس
      // باید قبل از خالی‌کردنِ input کپی شود — وگرنه خالی می‌شود و هیچ
      // فایلی اضافه نمی‌شود. (خالی‌کردن لازم است تا انتخابِ دوباره‌ی همان
      // فایل هم رویداد بدهد.)
      const files = Array.from(input?.target?.files ?? input ?? []);
      if (input?.target) input.target.value = "";
      if (!files.length) return;

      const room = maxCount - itemsRef.current.length;
      if (room <= 0) {
        if (notifyError) toast.error(`حداکثر ${maxCount} ${noun} می‌توانید اضافه کنید.`);
        return;
      }
      if (files.length > room && notifyError) {
        toast.error(`فقط ${room} ${noun} دیگر می‌توانید اضافه کنید.`);
      }

      const accepted = [];
      for (const file of files.slice(0, room)) {
        const validationError = validateFile(file);
        if (validationError) {
          if (notifyError) toast.error(`${file.name}: ${validationError}`);
          continue;
        }

        const id = localId();
        const preview = URL.createObjectURL(file);
        previewsRef.current.set(id, preview);
        accepted.push({
          id,
          objectKey: null,
          url: null,
          localPreview: preview,
          fileName: file.name,
          note: "",
          status: "uploading",
          progress: 0,
          error: null,
          file,
        });
      }

      if (!accepted.length) return;

      updateItems((current) => [...current, ...accepted]);
      accepted.forEach((item) => startUpload(item.id, item.file));
    },
    [maxCount, notifyError, noun, startUpload, updateItems, validateFile]
  );

  const removeItem = useCallback(
    (id) => {
      revokePreview(id);
      updateItems((current) => current.filter((item) => item.id !== id));
    },
    [revokePreview, updateItems]
  );

  const setNote = useCallback(
    (id, note) => patchItem(id, { note }),
    [patchItem]
  );

  /** تلاش دوباره برای قلمی که آپلودش شکست خورده — بقیه دست نمی‌خورند. */
  const retry = useCallback(
    (id) => {
      const item = itemsRef.current.find((entry) => entry.id === id);
      if (item?.file) startUpload(id, item.file);
    },
    [startUpload]
  );

  const reset = useCallback(
    (nextItems = []) => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewsRef.current.clear();
      const mapped = nextItems.map(itemFromServer);
      baselineKeysRef.current = new Set(mapped.map((item) => item.objectKey).filter(Boolean));
      sessionKeysRef.current = new Set();
      updateItems(mapped);
    },
    [updateItems]
  );

  const keptKeys = useMemo(
    () => new Set(items.map((item) => item.objectKey).filter(Boolean)),
    [items]
  );

  /** بعد از ثبتِ موفقِ سند: هرچه در لیستِ نهایی نیست، یتیم است. */
  const commit = useCallback(() => {
    const orphans = new Set([...sessionKeysRef.current, ...baselineKeysRef.current]);
    keptKeys.forEach((key) => orphans.delete(key));

    baselineKeysRef.current = new Set(keptKeys);
    sessionKeysRef.current = new Set(keptKeys);

    if (deleteOrphans && orphans.size) deleteImages([...orphans]);
  }, [deleteOrphans, keptKeys]);

  /** انصراف: فقط آپلودهای همین نشست پاک می‌شوند، نه تصاویرِ ثبت‌شده. */
  const discard = useCallback(() => {
    const orphans = [...sessionKeysRef.current].filter(
      (key) => !baselineKeysRef.current.has(key)
    );
    sessionKeysRef.current = new Set(baselineKeysRef.current);

    if (deleteOrphans && orphans.length) deleteImages(orphans);
  }, [deleteOrphans]);

  const isUploading = items.some((item) => item.status === "uploading");

  /**
   * فقط قلم‌هایی که کلید گرفته‌اند؛ قلمِ نیمه‌آپلود یا شکست‌خورده هرگز به
   * سرور نمی‌رود. شکلش هم برای `images` در `ReceivePurchase` درست است و
   * هم برای `attachments` در خرید/فروش — هر دو `{objectKey, fileName,
   * note}` می‌خواهند (بخش ۱۷ سند و بند ۳ سندِ ضمیمه‌ی فاکتور).
   */
  const payload = useMemo(
    () =>
      items
        .filter((item) => item.objectKey)
        .map((item) => ({
          objectKey: item.objectKey,
          fileName: item.fileName || undefined,
          note: item.note?.trim() || undefined,
        })),
    [items]
  );

  return useMemo(
    () => ({
      items,
      isUploading,
      hasErrors: items.some((item) => item.status === "error"),
      isFull: items.length >= maxCount,
      maxCount,
      /** مقدارِ `accept` ورودیِ فایل — هم‌راستا با همان اعتبارسنجی بالا. */
      accept,
      /**
       * همان آرایه‌ای که در بدنه‌ی دستور می‌رود: `attachments` در
       * `CreatePurchase`/`UpdatePurchase`/`CreateSale`/`UpdateSale`، و
       * `images` در `ReceivePurchase`.
       */
      filesPayload: payload,
      addFiles,
      removeItem,
      setNote,
      retry,
      reset,
      commit,
      discard,
    }),
    [
      accept,
      addFiles,
      commit,
      discard,
      isUploading,
      items,
      maxCount,
      payload,
      removeItem,
      reset,
      retry,
      setNote,
    ]
  );
}

export default useFileUploadList;
