// src/features/inventory/products/components/forms/ProductImageUpload.jsx
import { ImagePlus } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#/shared/components/ui/card";

export default function ProductImageUpload({ preview, onImageChange }) {
  return (
    <Card className="md:w-full">
      <CardHeader>
        <CardTitle className="text-lg text-center md:text-right">
          تصویر کالا
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4">
        <div className="w-45 aspect-square md:w-full mx-auto border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center overflow-hidden bg-muted/20 relative">
          {preview ? (
            <img
              src={preview}
              alt="پیش‌نمایش"
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <ImagePlus className="w-10 h-10 md:w-12 md:h-12 mb-2 opacity-50" />
              <span className="text-xs md:text-sm">عکسی انتخاب نشده</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onImageChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </CardContent>
    </Card>
  );
}
