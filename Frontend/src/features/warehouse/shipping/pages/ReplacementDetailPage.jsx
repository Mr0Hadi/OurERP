import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { useSalesReturnQuery } from "@/features/sales/returns/services/queries";
import OutboundShipmentForm from "../components/forms/OutboundShipmentForm";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { useReplacementShipmentForm } from "../hooks/useReplacementShipmentForm";
import { useConfirmReplacementShipmentBatchMutation } from "../services/mutations";
import { ROUTES } from "@/shared/constants/routes";

const TEXTS = {
  emptyMessage: "همه‌ی کالاهای جایگزین این مرجوعی قبلاً ارسال شده‌اند.",
  infoTitle: "اطلاعات ارسال جایگزین",
  confirmFullLabel: "تأیید ارسال کامل",
  confirmPartialLabel: "ثبت ارسال (بخشی)",
  partialHint:
    "برای هر کالا مقداری که این دور ارسال می‌کنید را وارد کنید؛ باقیمانده‌ی هر کالا برای دور بعدی نگه داشته می‌شود و دوباره در این صفحه ظاهر می‌شود.",
  dialogFullTitle: "ثبت ارسال کامل",
  dialogPartialTitle: "ثبت ارسال بخشی",
  dialogFullBody: "آیا مطمئن هستید که همه‌ی کالاهای جایگزین باقی‌مانده ارسال شده‌اند؟",
  dialogPartialBody:
    "فقط مقادیری که برای هر کالا وارد کرده‌اید ثبت می‌شود؛ بقیه برای دور بعدی می‌ماند.",
};

function ShippingReplacementForm({ salesReturn }) {
  const confirmMutation = useConfirmReplacementShipmentBatchMutation();
  const form = useReplacementShipmentForm(salesReturn);

  return (
    <OutboundShipmentForm
      form={form}
      texts={TEXTS}
      infoRows={[
        { label: "مشتری", value: salesReturn.customerName },
        { label: "شماره مرجوعی", value: salesReturn.returnNumber },
      ]}
      pendingCount={form.items.length}
      resetKey={salesReturn.id}
      isBusy={confirmMutation.isPending}
      onConfirm={({ onSuccess }) =>
        confirmMutation.mutate(
          { returnId: salesReturn.id, shipmentData: form.buildPayload() },
          { onSuccess },
        )
      }
    />
  );
}

export default function ReplacementDetailPage() {
  const { returnId } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: salesReturn, isLoading, isError } = useSalesReturnQuery(Number(returnId));

  useEffect(() => {
    setHeader({
      title: isLoading ? "در حال بارگذاری..." : "ارسال کالای جایگزین",
      showBack: true,
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, isLoading]);

  if (isLoading)
    return (
      <WarehouseFormSkeleton
        itemActionSlot={false}
        summaryRows={2}
        hasSecondaryAction={false}
      />
    );

  if (isError || !salesReturn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">مرجوعی مورد نظر یافت نشد.</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.WAREHOUSE_SHIPPING)}>بازگشت به لیست</Button>
      </div>
    );
  }

  return (
    <ShippingReplacementForm
      key={`${salesReturn.id}:${salesReturn.updatedAt}`}
      salesReturn={salesReturn}
    />
  );
}
