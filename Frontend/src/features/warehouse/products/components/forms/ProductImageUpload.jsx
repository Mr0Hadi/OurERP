// src/features/warehouse/products/components/forms/ProductImageUpload.jsx
import { ImagePlus } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import ImageUploadField from "@/shared/components/files/ImageUploadField";

/**
 * فقط قابِ کارتِ «تصویر کالا». خودِ فیلد مشترک است تا رفتار آپلود (نوار
 * پیشرفت، خطای فرمت/حجم، بزرگ‌نمایی) در محصول و مشتری و تامین‌کننده یکی
 * باشد؛ چیزی که وقتی هر سه نسخه‌ی کپی‌شده‌ی خودشان را داشتند نبود.
 */
export default function ProductImageUpload({ imageUpload }) {
  return (
    <Card className="md:w-full">
      <CardHeader>
        <CardTitle className="text-lg text-center md:text-right">تصویر کالا</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4">
        <ImageUploadField
          upload={imageUpload}
          label="تصویر کالا"
          emptyIcon={ImagePlus}
        />
      </CardContent>
    </Card>
  );
}
