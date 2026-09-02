// src/shared/components/files/FileUploadList.jsx
import { FileText, ImagePlus, Paperclip, RotateCcw, X, ZoomIn } from "lucide-react";
import { useId, useState } from "react";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/shared/components/ui/attachment";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Progress } from "@/shared/components/ui/progress";
import { Spinner } from "@/shared/components/ui/spinner";
import ImageLightbox from "@/shared/components/files/ImageLightbox";
import { cn } from "@/shared/lib/utils";
import { IMAGE_ACCEPT, isPdfName } from "@/shared/services/files/fileConstraints";

/**
 * فهرستِ فایل‌های ضمیمه‌ی یک *سند* — ضمیمه‌ی فاکتور/پیش‌فاکتور و
 * تصاویر نوبتِ دریافت. ورودی‌اش `list`، خروجی هوکِ `useFileUploadList`
 * است؛ این‌جا فقط نمایش است و هیچ منطقی از آپلود ندارد.
 *
 * ظاهر روی `components/ui/attachment` سوار است تا با بقیه‌ی برنامه
 * یک‌دست بماند (همان توکن‌های رنگ و همان دکمه‌ها) و حالت‌های
 * «در حال آپلود / آماده / خطا» را همان `data-state` استانداردِ آن
 * کامپوننت نشان بدهد.
 *
 * قلمِ PDF بندانگشتی ندارد (`<img>` کادرِ شکسته می‌دهد): آیکن می‌گیرد و
 * کلیک‌کردنش فایل را در تب تازه باز می‌کند، نه لایت‌باکس.
 *
 * چیدمان با *container query* است نه breakpointِ صفحه: همین لیست هم در
 * ستونِ باریکِ کنارِ فرمِ خرید/فروش (~۳۵۰ پیکسل) می‌نشیند و هم در کارتِ
 * تمام‌عرضِ صفحه‌ی مرجوعی. با `sm:` صفحه، حالتِ دوستونه در آن ستونِ
 * باریک هم روشن می‌شد و هر کارت به اندازه‌ی یک نامِ فایل هم جا نداشت.
 */

const STATE_BY_STATUS = {
  uploading: "uploading",
  error: "error",
  ready: "done",
};

export default function FileUploadList({
  list,
  title = "فایل‌ها",
  emptyLabel = "هنوز فایلی اضافه نشده است.",
  withNotes = true,
  notePlaceholder = "توضیح (اختیاری)",
  disabled = false,
  className,
}) {
  const inputId = useId();
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const { items, addFiles, removeItem, setNote, retry, isFull, maxCount } = list;
  const accept = list.accept || IMAGE_ACCEPT;
  const acceptsPdf = accept.includes(".pdf");
  const noun = acceptsPdf ? "فایل" : "تصویر";
  const locked = disabled || isFull;

  return (
    <div className={cn("@container/files space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <span className="min-w-0 truncate text-sm font-medium">
          {title}
          <span className="text-muted-foreground font-normal">
            {` (${items.length} از ${maxCount})`}
          </span>
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={locked}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          <Paperclip className="h-3.5 w-3.5 ml-1.5" />
          {`افزودن ${noun}`}
        </Button>

        <Input
          id={inputId}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          disabled={locked}
          onChange={(event) => addFiles(event)}
        />
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-xs leading-relaxed text-muted-foreground @sm/files:py-6">
          {emptyLabel}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 @md/files:grid-cols-2">
          {items.map((item) => {
            const src = item.localPreview || item.url;
            // نامِ فایل مبناست نه URL: پیش‌نمایشِ محلیِ PDF یک blob است و
            // پسوند ندارد، ولی همان لحظه هم باید آیکن نشان داده شود.
            const isPdf = isPdfName(item.fileName) || isPdfName(item.objectKey || "");
            const openable = Boolean(src) && item.status !== "uploading";

            const open = () => {
              if (!openable) return;
              if (isPdf) window.open(src, "_blank", "noopener");
              else setLightboxSrc(src);
            };

            return (
              <li key={item.id} className="min-w-0">
                <Attachment
                  state={STATE_BY_STATUS[item.status] ?? "done"}
                  size="sm"
                  // `min-w-0` قیدِ `min-w-40`ِ خودِ کامپوننت را برمی‌دارد:
                  // در ستونِ باریک، آن قید کارت را از کادر بیرون می‌زد.
                  className="w-full min-w-0"
                >
                  <AttachmentMedia variant={!isPdf && src ? "image" : "icon"}>
                    {item.status === "uploading" ? (
                      <Spinner />
                    ) : isPdf ? (
                      <FileText />
                    ) : src ? (
                      <img src={src} alt={item.fileName} />
                    ) : (
                      <ImagePlus />
                    )}
                  </AttachmentMedia>

                  <AttachmentContent>
                    <AttachmentTitle title={item.fileName} dir="auto">
                      {item.fileName}
                    </AttachmentTitle>

                    {item.status === "error" ? (
                      <AttachmentDescription>{item.error}</AttachmentDescription>
                    ) : item.status === "uploading" ? (
                      <>
                        <AttachmentDescription>
                          {`در حال بارگذاری… ${item.progress}٪`}
                        </AttachmentDescription>
                        <Progress value={item.progress} className="mt-1.5" />
                      </>
                    ) : (
                      withNotes && (
                        <Input
                          value={item.note}
                          placeholder={notePlaceholder}
                          disabled={disabled}
                          className="mt-1.5 h-7 text-xs"
                          onChange={(event) => setNote(item.id, event.target.value)}
                        />
                      )
                    )}
                  </AttachmentContent>

                  <AttachmentActions>
                    {item.status === "error" ? (
                      <AttachmentAction
                        type="button"
                        aria-label="تلاش دوباره"
                        title="تلاش دوباره"
                        onClick={() => retry(item.id)}
                      >
                        <RotateCcw />
                      </AttachmentAction>
                    ) : (
                      openable && (
                        <AttachmentAction
                          type="button"
                          aria-label={isPdf ? "باز کردن فایل" : "بزرگ‌نمایی تصویر"}
                          title={isPdf ? "باز کردن فایل" : "بزرگ‌نمایی تصویر"}
                          onClick={open}
                        >
                          <ZoomIn />
                        </AttachmentAction>
                      )
                    )}

                    <AttachmentAction
                      type="button"
                      variant="destructive"
                      aria-label={`حذف ${noun}`}
                      title={`حذف ${noun}`}
                      disabled={disabled}
                      onClick={() => removeItem(item.id)}
                    >
                      <X />
                    </AttachmentAction>
                  </AttachmentActions>

                  {/* وقتی یادداشت هست، کلِ کارت نباید کلیک‌پذیر باشد —
                      روی input می‌افتد. آن‌جا دکمه‌ی بزرگ‌نمایی کافی است. */}
                  {openable && !withNotes && (
                    <AttachmentTrigger aria-label="مشاهده" onClick={open} />
                  )}
                </Attachment>
              </li>
            );
          })}
        </ul>
      )}

      <ImageLightbox
        src={lightboxSrc}
        open={Boolean(lightboxSrc)}
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
