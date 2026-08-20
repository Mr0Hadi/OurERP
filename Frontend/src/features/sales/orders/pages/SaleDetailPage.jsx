import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useHeaderStore } from "@/shared/store/headerStore";
import { useSaleQuery } from "@/features/sales/orders/services/queries";
import OrderFormSkeleton from "@/shared/components/skeletons/OrderFormSkeleton";
import { ROUTES } from "@/shared/constants/routes";
import SaleDetailForm from "./SaleDetailForm";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";

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
      <DetailErrorState
        message={
          saleError ? "خطا در بارگذاری اطلاعات" : "فروشی با این شناسه یافت نشد."
        }
        onBack={() => navigate(ROUTES.SALES)}
      />
    );
  }

  return <SaleDetailForm key={sale.id} saleData={sale} />;
}
