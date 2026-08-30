// src/shared/components/files/ImageUploadList.jsx
import { ImagePlus, Loader2, RotateCcw, X, ZoomIn } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import ImageLightbox from "@/shared/components/files/ImageLightbox";
import { cn } from "@/shared/lib/utils";
import { IMAGE_ACCEPT } from "@/shared/services/files/fileConstraints";

/**
 * گالریِ «چند تصویر با یادداشت» — تصاویر رسید کالا (بخش ۱۷ سند) و هر
 * جای دیگری که ضمیمه‌ی یک سند است، نه تصویرِ یک موجودیت.
 *
 * یادداشت عمداً کنارِ خودِ تصویر است و نه یک textareaِ کلی: سرور برای هر
 * قلم یک `note` جدا می‌گیرد و کاربرِ انبار هم دقیقاً همین‌طور فکر می‌کند
 * («این یکی کارتنِ آسیب‌دیده است، آن یکی بارنامه»).
 *
 * `list` خروجی `useImageUploadList` است.
 */
export default function ImageUploadList({
  list,
  title = "تصاویر",
  emptyLabel = "هنوز تصویری اضافه نشده است.",
  withNotes = true,
  notePlaceholder = "توضیح (اختیاری)",
  disabled = false,
  className,
}) {
  const inputId = useId();
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const { items, addFiles, removeItem, setNote, retry, isFull, maxCount } = list;
  const locked = disabled || isFull;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {title}
          <span className="text-muted-foreground font-normal">
            {` (${items.length} از ${maxCount})`}
          </span>
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={locked}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          <ImagePlus className="h-3.5 w-3.5 ml-1.5" />
          افزودن تصویر
        </Button>

        <Input
          id={inputId}
          type="file"
          multiple
          accept={IMAGE_ACCEPT}
          className="hidden"
          disabled={locked}
          onChange={(event) => addFiles(event)}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground border border-dashed border-border rounded-xl py-6 text-center">
          {emptyLabel}
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => {
            const src = item.localPreview || item.url;

            return (
              <li
                key={item.id}
                className="flex gap-3 items-start border border-border rounded-xl p-2.5 bg-card"
              >
                <div
                  className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-muted border border-border cursor-pointer group"
                  onClick={() => src && setLightboxSrc(src)}
                >
                  {src ? (
                    <img
                      src={src}
                      alt={item.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  {item.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-0.5">
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                      <span className="text-[9px] text-white">{item.progress}٪</span>
                    </div>
                  )}

                  {item.status === "ready" && src && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-xs truncate" title={item.fileName}>
                    {item.fileName}
                  </p>

                  {item.status === "error" ? (
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] text-destructive line-clamp-2 flex-1">
                        {item.error}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => retry(item.id)}
                      >
                        <RotateCcw className="h-3 w-3 ml-1" />
                        تلاش دوباره
                      </Button>
                    </div>
                  ) : (
                    withNotes && (
                      <Input
                        value={item.note}
                        placeholder={notePlaceholder}
                        disabled={disabled}
                        className="h-8 text-xs"
                        onChange={(event) => setNote(item.id, event.target.value)}
                      />
                    )
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="حذف تصویر"
                  disabled={disabled}
                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => removeItem(item.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
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
