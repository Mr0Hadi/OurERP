import ReturnClaimsSection from "@/shared/components/forms/ReturnClaimsSection";
import { PURCHASE_RETURN_REASON_LABELS } from "../../services/mockData";

export default function PurchaseReturnItemsSection({
  items,
  onAddClaim,
  onUpdateClaim,
  onRemoveClaim,
}) {
  return (
    <ReturnClaimsSection
      items={items}
      reasonLabels={PURCHASE_RETURN_REASON_LABELS}
      title="اقلام مرجوعی"
      description="برای هر کالا می‌توانید تعداد را بین چند دلیل مختلف تقسیم کنید — مثلاً بخشی کسری و بخشی دیگر معیوب باشد. سقف هر کالا بر اساس کل کسریِ باز و هنوز تصمیم‌گیری‌نشده‌ی همان کالاست."
      emptyText="گزارشی برای این خرید یافت نشد"
      addClaimLabel="افزودن دلیل برای بخشی دیگر از این کالا"
      noClaimHint="اگر چیزی از این کالا را مرجوع نمی‌کنید، نیازی به کاری نیست."
      onAddClaim={onAddClaim}
      onUpdateClaim={onUpdateClaim}
      onRemoveClaim={onRemoveClaim}
    />
  );
}
