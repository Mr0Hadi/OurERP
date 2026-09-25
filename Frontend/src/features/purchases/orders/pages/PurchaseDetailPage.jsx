import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useHeaderStore } from "@/shared/store/headerStore";
import { usePurchaseQuery } from "@/features/purchases/orders/services/queries";
import OrderFormSkeleton from "@/shared/components/skeletons/OrderFormSkeleton";
import PurchaseDetailForm from "./PurchaseDetailForm";
import PurchaseIssuedView from "./PurchaseIssuedView";
import { isPurchaseProforma } from "@/features/purchases/orders/services/constants";
import { ROUTES } from "@/shared/constants/routes";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: purchase, isLoading, isError } = usePurchaseQuery(id);

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : purchase
          ? isPurchaseProforma(purchase.status)
            ? "ویرایش پیش‌فاکتور خرید"
            : `فاکتور خرید ${purchase.invoiceNumber || ""}`.trim()
          : "خطا",
      showBack: true,
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, purchase, isLoading]);

  if (isLoading) return <OrderFormSkeleton />;

  if (isError || !purchase) {
    return (
      <DetailErrorState
        message="خرید مورد نظر یافت نشد یا خطایی رخ داده است."
        onBack={() => navigate(ROUTES.PURCHASES)}
      />
    );
  }

  // قفل پیش‌فاکتور: فقط پیش‌فاکتور ویرایش می‌شود؛ خریدِ صادرشده فقط‌خواندنی است.
  if (!isPurchaseProforma(purchase.status)) {
    return <PurchaseIssuedView key={purchase.id} purchase={purchase} />;
  }
  return <PurchaseDetailForm key={purchase.id} purchaseData={purchase} />;
}
