// src/shared/components/files/ImageUploadField.jsx
import { ImagePlus, Loader2, Upload, X, ZoomIn } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import ImageLightbox from "@/shared/components/files/ImageLightbox";
import { cn } from "@/shared/lib/utils";
import { IMAGE_ACCEPT } from "@/shared/services/files/fileConstraints";

/**
 * فیلدِ «یک تصویر» — همان ظاهرِ آشنای فرم‌های محصول/مشتری/تامین‌کننده،
 * یک‌بار نوشته شده.
 *
 * سه چیز که در نسخه‌های کپی‌شده نبود و این‌جا هست:
 *
 * - **حالت آپلود.** چون آپلود واقعاً روی شبکه می‌رود، کاربر باید نوارِ
 *   پیشرفت و قفلِ دکمه‌ها را ببیند؛ در نسخه‌های قبلی تصویر فقط base64ِ
 *   محلی بود و اصلاً حالتی وجود نداشت.
 * - **خطای کنارِ فیلد**، نه فقط toast — خطای فرمت/حجم مالِ همین فیلد است.
 * - **`id` یکتا.** نسخه‌های قبلی `document.getElementById("image")` را صدا
 *   می‌زدند؛ دو نمونه در یک صفحه یعنی کلیک روی یکی، دیگری را باز می‌کرد.
 *
 * یا `upload` (خروجی `useImageUpload`) را بدهید، یا پروپ‌های تکی را —
 * تا در جایی که state جای دیگری نگه داشته می‌شود هم قابل استفاده باشد.
 */
export default function ImageUploadField({
  upload,
  previewUrl,
  isUploading,
  progress,
  error,
  onSelect,
  onRemove,
  label = "تصویر",
  emptyLabel = "بدون تصویر",
  emptyIcon: EmptyIcon = ImagePlus,
  shape = "square",
  size = "md",
  disabled = false,
  className,
}) {
  const inputId = useId();
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const preview = upload?.previewUrl ?? previewUrl ?? null;
  const uploading = upload?.isUploading ?? isUploading ?? false;
  const percent = upload?.progress ?? progress ?? 0;
  const message = upload?.error ?? error ?? null;
  const select = upload?.selectFile ?? onSelect;
  const clear = upload?.remove ?? onRemove;
  const locked = disabled || uploading;

  const sizeClass = {
    sm: "w-20 h-20 sm:w-24 sm:h-24",
    md: "w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32",
    lg: "w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40",
  }[size];

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-2xl";

  return (
    <>
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <div className="relative group">
          <div
            className={cn(
              "border-2 border-dashed border-border transition-all flex items-center justify-center overflow-hidden bg-muted/30 shadow-inner",
              sizeClass,
              shapeClass,
              locked ? "cursor-default opacity-90" : "cursor-pointer"
            )}
            onClick={() => {
              if (locked) return;
              if (preview) setLightboxOpen(true);
              else document.getElementById(inputId)?.click();
            }}
          >
            {preview ? (
              <>
                <img src={preview} alt={label} className="w-full h-full object-cover" />
                {!locked && (
                  <div
                    className={cn(
                      "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1",
                      shapeClass
                    )}
                  >
                    <ZoomIn className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    <span className="text-[10px] sm:text-xs text-white font-medium">
                      بزرگ‌نمایی
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground px-2">
                  <EmptyIcon className="h-8 w-8 sm:h-10 sm:w-10 stroke-[1.5]" />
                  <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">
                    {emptyLabel}
                  </span>
                </div>
                {!locked && (
                  <div
                    className={cn(
                      "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1",
                      shapeClass
                    )}
                  >
                    <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    <span className="text-[10px] sm:text-xs text-white font-medium">آپلود</span>
                  </div>
                )}
              </>
            )}

            {uploading && (
              <div
                className={cn(
                  "absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5",
                  shapeClass
                )}
              >
                <Loader2 className="h-5 w-5 text-white animate-spin" />
                <span className="text-[10px] text-white font-medium">
                  {percent ? `${percent}٪` : "در حال بارگذاری"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* نوار پیشرفت: تنها بازخوردی که می‌گوید فایل بزرگ گیر نکرده. */}
        {uploading && (
          <div className="w-full max-w-[9rem] h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.max(percent, 5)}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-2 w-full">
          <Label
            htmlFor={inputId}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 sm:px-4 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-medium shadow-sm select-none transition-all",
              locked
                ? "opacity-50 pointer-events-none"
                : "cursor-pointer hover:bg-primary/90 hover:shadow-md active:scale-95"
            )}
          >
            <Upload className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {preview ? "تغییر تصویر" : "بارگذاری تصویر"}
          </Label>

          <Input
            id={inputId}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            disabled={locked}
            onChange={(event) => select?.(event)}
          />

          {preview && (
            <Button
              type="button"
              variant="outline"
              aria-label="حذف تصویر"
              disabled={locked}
              className="h-8 sm:h-9 w-8 sm:w-9 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 active:scale-95 transition-all"
              onClick={() => clear?.()}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {message && (
          <p className="text-xs text-destructive text-center leading-relaxed">{message}</p>
        )}
      </div>

      <ImageLightbox
        src={preview}
        alt={label}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
