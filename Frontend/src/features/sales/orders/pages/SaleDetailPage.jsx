import { useParams, useNavigate } from "react-router-dom";

import { useSaleQuery } from "@/features/sales/orders/services/queries";
import OrderFormSkeleton from "@/shared/components/skeletons/OrderFormSkeleton";
import { ROUTES } from "@/shared/constants/routes";
import SaleForm from "./SaleForm";
import SaleIssuedView from "./SaleIssuedView";
import { isSaleProforma } from "@/shared/domain/enums/saleStatus";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import { usePageHeader } from "@/shared/hooks/usePageHeader";

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();


  const {
    data: sale,
    isLoading: saleLoading,
    isError: saleError,
    error: loadError,
    refetch: retryLoad,
  } = useSaleQuery(id);

  usePageHeader({
    title: saleLoading
      ? "در حال بارگذاری..."
      : sale
        ? isSaleProforma(sale.status)
          ? "ویرایش پیش‌فاکتور فروش"
          : `فاکتور فروش ${sale.invoiceNumber || ""}`.trim()
        : "خطا",
    showBack: true,
  });

  if (saleLoading) return <OrderFormSkeleton />;

  if (saleError || !sale) {
    return (
      <DetailErrorState
        error={loadError}
        notFoundMessage="فروش مورد نظر یافت نشد."
        onRetry={retryLoad}
        onBack={() => navigate(ROUTES.SALES)}
      />
    );
  }

  // قفل پیش‌فاکتور: فقط پیش‌فاکتور ویرایش می‌شود؛ فروشِ صادرشده فقط‌خواندنی است.
  if (!isSaleProforma(sale.status)) {
    return <SaleIssuedView key={sale.id} sale={sale} />;
  }
  return <SaleForm key={sale.id} sale={sale} />;
}
