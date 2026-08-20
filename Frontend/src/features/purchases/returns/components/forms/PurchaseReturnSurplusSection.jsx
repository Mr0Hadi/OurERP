import ReturnClaimsSection from "@/shared/components/forms/ReturnClaimsSection";
import { SURPLUS_RETURN_REASON_LABELS } from "../../services/mockData";

/**
 * ادعاهای مازاد — کالای اضافه و کالای ثبت‌نشده — جدا از کسری.
 *
 * جدایی صرفاً چیدمانی نیست: سقف این ردیف‌ها از سفارش نمی‌آید، دلایلشان
 * از واژگان دیگری است، و تصمیم‌هایی که بعداً می‌شود برایشان گرفت
 * (عودت / نگهداری با پرداخت / نگهداری بدون پرداخت) هیچ اشتراکی با
 * تصمیم‌های کسری ندارد.
 */
export default function PurchaseReturnSurplusSection({
  items,
  onAddClaim,
  onUpdateClaim,
  onRemoveClaim,
}) {
  if (items.length === 0) return null;

  return (
    <ReturnClaimsSection
      items={items}
      reasonLabels={SURPLUS_RETURN_REASON_LABELS}
      title="اقلام مازاد (اضافه یا ثبت‌نشده)"
      description="کالایی که فیزیکاً تحویل گرفته‌ایم ولی سفارش توجیهش نمی‌کند. تعداد هر ردیف را می‌توانید بین «ارسال اضافه» و «کالای ثبت‌نشده» تقسیم کنید؛ تصمیمِ عودت یا نگهداری در مرحله‌ی بعد و برای هر بخش جداگانه گرفته می‌شود."
      emptyText="مازادی برای این خرید ثبت نشده"
      addClaimLabel="افزودن ردیف برای بخشی دیگر از این مازاد"
      noClaimHint="اگر این مازاد را پیگیری نمی‌کنید، نیازی به کاری نیست."
      onAddClaim={onAddClaim}
      onUpdateClaim={onUpdateClaim}
      onRemoveClaim={onRemoveClaim}
    />
  );
}
