// src/features/warehouse/products/components/forms/ProductImageUpload.jsx
import { ImagePlus, Upload, X, ZoomIn, Pencil } from "lucide-react";
import { useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#/shared/components/ui/card";
import { Button } from "#/shared/components/ui/button";
import { Label } from "#/shared/components/ui/label";
import { Input } from "#/shared/components/ui/input";

export default function ProductImageUpload({ preview, onImageChange, onImageRemove }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onImageChange(file);
  };

  return (
    <>
      <Card className="md:w-full">
        <CardHeader>
          <CardTitle className="text-lg text-center md:text-right">
            تصویر کالا
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4">

          {/* تصویر */}
          <div className="relative group">
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl border-2 border-dashed border-border transition-all flex items-center justify-center overflow-hidden bg-muted/30 shadow-inner cursor-pointer"
              onClick={() =>
                preview
                  ? setLightboxOpen(true)
                  : document.getElementById("product-image-input").click()
              }
            >
              {preview ? (
                <>
                  <img
                    src={preview}
                    alt="تصویر کالا"
                    className="w-full h-full object-cover"
                  />
                  {/* overlay زوم */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center gap-1">
                    <ZoomIn className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    <span className="text-[10px] sm:text-xs text-white font-medium">
                      بزرگ‌نمایی
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground px-2">
                    <ImagePlus className="h-8 w-8 sm:h-10 sm:w-10 stroke-[1.5]" />
                    <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">
                      بدون تصویر
                    </span>
                  </div>
                  {/* overlay آپلود */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center gap-1">
                    <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    <span className="text-[10px] sm:text-xs text-white font-medium">
                      آپلود
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* دکمه‌ها */}
          <div className="flex items-center justify-center gap-2 w-full">
            <Label
              htmlFor="product-image-input"
              className="cursor-pointer inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 sm:px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all text-xs sm:text-sm font-medium shadow-sm hover:shadow-md select-none"
            >
              <Upload className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {preview ? "تغییر تصویر" : "بارگذاری تصویر"}
            </Label>

            <Input
              id="product-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {preview && (
              <Button
                type="button"
                variant="outline"
                className="h-8 sm:h-9 w-8 sm:w-9 p-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 active:scale-95 transition-all"
                onClick={onImageRemove}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-sm sm:max-w-md md:max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={preview}
              alt="تصویر کالا"
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
            <Button
              type="button"
              variant="ghost"
              className="absolute -top-3 -right-3 h-8 w-8 p-0 rounded-full bg-white text-black hover:bg-white/90 shadow-md"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
