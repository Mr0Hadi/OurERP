import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { usePurchaseReturnQuery } from "@/features/purchases/returns/services/queries";
import OutboundShipmentForm from "../components/forms/OutboundShipmentForm";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { useSupplierReturnShipmentForm } from "../hooks/useSupplierReturnShipmentForm";
import { useConfirmSupplierReturnShipmentBatchMutation } from "../services/mutations";
import { ROUTES } from "@/shared/constants/routes";

const TEXTS = {
  emptyMessage: "همه‌ی کالاهای مازاد این مرجوعی قبلاً به تامین‌کننده عودت داده شده‌اند.",
  infoTitle: "اطلاعات عودت به تامین‌کننده",
  confirmFullLabel: "تأیید عودت کامل",
  confirmPartialLabel: "ثبت عودت (بخشی)",
  partialHint:
    "برای هر کالا مقداری که این دور عودت می‌دهید را وارد کنید؛ باقیمانده برای دور بعدی نگه داشته می‌شود و دوباره در این صفحه ظاهر می‌شود.",
  dialogFullTitle: "ثبت عودت کامل",
  dialogPartialTitle: "ثبت عودت بخشی",
  dialogFullBody:
    "آیا مطمئن هستید که همه‌ی کالاهای مازاد باقی‌مانده به تامین‌کننده عودت داده شده‌اند؟",
  dialogPartialBody:
    "فقط مقادیری که برای هر کالا وارد کرده‌اید ثبت می‌شود؛ بقیه برای دور بعدی می‌ماند.",
};

function SupplierReturnShipmentForm({ purchaseReturn }) {
  const confirmMutation = useConfirmSupplierReturnShipmentBatchMutation();
  const form = useSupplierReturnShipmentForm(purchaseReturn);

  return (
    <OutboundShipmentForm
      form={form}
      texts={TEXTS}
      infoRows={[
        { label: "تامین‌کننده", value: purchaseReturn.supplierName },
        { label: "شماره مرجوعی", value: purchaseReturn.returnNumber },
        { label: "فاکتور خرید مبدا", value: purchaseReturn.purchaseInvoiceNumber },
      ]}
      pendingCount={form.items.length}
      resetKey={purchaseReturn.id}
      isBusy={confirmMutation.isPending}
      onConfirm={({ onSuccess }) =>
        confirmMutation.mutate(
          { returnId: purchaseReturn.id, shipmentData: form.buildPayload() },
          { onSuccess },
        )
      }
    />
  );
}

export default function SupplierReturnDetailPage() {
  const { returnId } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const {
    data: purchaseReturn,
    isLoading,
    isError,
  } = usePurchaseReturnQuery(returnId);

  useEffect(() => {
    setHeader({
      title: isLoading ? "در حال بارگذاری..." : "عودت کالا به تامین‌کننده",
      showBack: true,
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, isLoading]);

  if (isLoading)
    return (
      <WarehouseFormSkeleton
        itemActionSlot={false}
        summaryRows={3}
        hasSecondaryAction={false}
      />
    );

  if (isError || !purchaseReturn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">مرجوعی مورد نظر یافت نشد.</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.WAREHOUSE_SHIPPING)}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return (
    <SupplierReturnShipmentForm
      key={`${purchaseReturn.id}:${purchaseReturn.updatedAt}`}
      purchaseReturn={purchaseReturn}
    />
  );
}
