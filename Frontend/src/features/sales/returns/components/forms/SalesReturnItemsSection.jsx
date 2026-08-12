import ReturnClaimsSection from "@/shared/components/forms/ReturnClaimsSection";
import { SALES_RETURN_REASON_LABELS } from "../../services/mockData";

export default function SalesReturnItemsSection({
  items,
  onAddClaim,
  onUpdateClaim,
  onRemoveClaim,
}) {
  return (
    <ReturnClaimsSection
      items={items}
      reasonLabels={SALES_RETURN_REASON_LABELS}
      title="اقلام قابل مرجوع‌کردن"
      description="برای هر کالا می‌توانید تعداد را بین چند دلیل مختلف تقسیم کنید — مثلاً بخشی آسیب‌دیده و بخشی دیگر تاریخ‌گذشته باشد. سقف هر کالا بر اساس مقداری است که واقعاً تحویل مشتری شده و هنوز مرجوعی فعالی برایش ثبت نشده."
      emptyText="برای این فاکتور، هیچ کالای قابل مرجوع‌کردنی باقی نمانده است"
      addClaimLabel="افزودن دلیل برای بخشی از این کالا"
      noClaimHint="اگر مشتری چیزی از این کالا را برنمی‌گرداند، نیازی به کاری نیست."
      onAddClaim={onAddClaim}
      onUpdateClaim={onUpdateClaim}
      onRemoveClaim={onRemoveClaim}
    />
  );
}
