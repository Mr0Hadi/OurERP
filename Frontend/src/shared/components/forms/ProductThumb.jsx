import RemoteImage from "@/shared/components/files/RemoteImage";

/**
 * بندانگشتیِ کالا در خطوطِ سند.
 *
 * `imageUrl` همیشه همراهِ پاسخ نمی‌آید — بعضی خطوطِ سند فقط `imageKey`
 * دارند و `<img>`ِ ساده آن‌جا یک آیکونِ شکسته می‌شود. `RemoteImage` در
 * آن حالت آدرس را از روی کلید می‌گیرد.
 */
export default function ProductThumb({ item }) {
  return (
    <RemoteImage
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
