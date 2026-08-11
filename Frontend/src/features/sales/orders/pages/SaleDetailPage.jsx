import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { useSaleQuery } from "@/features/sales/orders/services/queries";
import OrderFormSkeleton from "@/shared/components/skeletons/OrderFormSkeleton";
import { ROUTES } from "@/shared/constants/routes";
import SaleDetailForm from "./SaleDetailForm";

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const {
    data: sale,
    isLoading: saleLoading,
    isError: saleError,
  } = useSaleQuery(id);

  useEffect(() => {
    setHeader({
      title: saleLoading ? "در حال بارگذاری..." : sale ? "ویرایش فروش" : "خطا",
      showBack: true,
      onBack: () => navigate(-1),
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, navigate, sale, saleLoading]);

  if (saleLoading) return <OrderFormSkeleton />;

  if (saleError || !sale) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          {saleError
            ? "خطا در بارگذاری اطلاعات"
            : "فروشی با این شناسه یافت نشد."}
        </p>
        <Button variant="outline" onClick={() => navigate(ROUTES.SALES)}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return <SaleDetailForm key={sale.id} saleData={sale} />;
}
