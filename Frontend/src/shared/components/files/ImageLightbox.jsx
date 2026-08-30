// src/shared/components/files/ImageLightbox.jsx
import { X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/shared/components/ui/button";

/**
 * بزرگ‌نماییِ یک تصویر روی صفحه.
 *
 * پیش از این، عیناً همین overlay در فرمِ محصول، مشتری و تامین‌کننده کپی
 * شده بود؛ هرکدام هم یک ریزتفاوت داشتند (یکی با Escape بسته می‌شد، یکی
 * نه). چون هیچ چیزِ آن مالِ دامنه نیست، جایش این‌جاست.
 */
export default function ImageLightbox({ src, alt = "تصویر", open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative max-w-sm sm:max-w-md md:max-w-lg w-full"
        onClick={(event) => event.stopPropagation()}
      >
        <img src={src} alt={alt} className="w-full h-auto rounded-2xl shadow-2xl" />
        <Button
          type="button"
          variant="ghost"
          aria-label="بستن"
          className="absolute -top-3 -right-3 h-8 w-8 p-0 rounded-full bg-white text-black hover:bg-white/90 shadow-md"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
