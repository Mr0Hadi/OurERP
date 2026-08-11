// src/features/purchases/pages/PurchaseDetailPage.jsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import { Button } from "#/shared/components/ui/button";
import { useHeaderStore } from "#/shared/store/headerStore";
import { usePurchaseQuery } from "#/features/purchases/orders/services/queries";
import OrderFormSkeleton from "@/shared/components/skeletons/OrderFormSkeleton";
import PurchaseDetailForm from "./PurchaseDetailForm";
import { ROUTES } from "@/shared/constants/routes";

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
          ? "ویرایش خرید"
          : "خطا",
      showBack: true,
      onBack: () => navigate(-1),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, purchase, isLoading]);

  if (isLoading) return <OrderFormSkeleton />;

  if (isError || !purchase) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          خرید مورد نظر یافت نشد یا خطایی رخ داده است.
        </p>
        <Button variant="outline" onClick={() => navigate(ROUTES.PURCHASES)}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return <PurchaseDetailForm key={purchase.id} purchaseData={purchase} />;
}
