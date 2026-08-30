import SignedImage from "@/shared/components/files/SignedImage";

/**
 * بندانگشتیِ کالا در خطوطِ سند.
 *
 * `imageUrl` که از سرور می‌آید یک امضای موقتی است (بخش ۱۷ سند)؛ در صفحه‌ی
 * دریافت/ارسال که ممکن است ساعت‌ها باز بماند، `<img>` ساده بعد از انقضا
 * فقط یک آیکونِ شکسته می‌شود. `SignedImage` در آن حالت با `imageKey`
 * امضای تازه می‌گیرد.
 */
export default function ProductThumb({ item }) {
  return (
    <SignedImage
      imageKey={item.imageKey}
      imageUrl={item.imageUrl ?? item.image}
      alt={item.productName}
      className="w-10 h-10 rounded-md object-cover shrink-0 border border-border"
      fallback={
        <div className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center shrink-0">
          <span className="text-[10px] text-muted-foreground">تصویر</span>
        </div>
      }
    />
  );
}
