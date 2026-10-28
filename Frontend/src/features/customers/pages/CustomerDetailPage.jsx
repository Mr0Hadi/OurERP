import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, X, Trash2 } from "lucide-react";
import { useCustomerQuery } from "../services/queries";
import {
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} from "../services/mutations";
import { Button } from "@/shared/components/ui/button";
import PartyDetailLoading from "@/features/partyAccount/components/PartyDetailLoading";
import { useCustomerForm } from "../hooks/useCustomerForm";
import CustomerIdentityForm from "../components/forms/CustomerIdentityForm";
import PartyFinanceForm from "@/features/partyAccount/components/PartyFinanceForm";
import PartyAddressForm from "@/features/partyAccount/components/PartyAddressForm";
import { ROUTES } from "@/shared/constants/routes";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import PartyStatementCard from "@/features/partyAccount/components/PartyStatementCard";
import {
  openingBalanceOf,
  partyBalanceOf,
} from "@/features/partyAccount/domain/partyBalance";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import CustomerInstallmentsCard from "@/features/sales/installments/components/CustomerInstallmentsCard";
import AuditHistoryButton from "@/features/audit/components/AuditHistoryButton";
import PartyOnAccountBar from "@/features/treasury/partyPayments/components/PartyOnAccountBar";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";

function CustomerDetailForm({ customerData }) {
  // react-hook-form خطاها را در همان شیءِ `errors` می‌نویسد؛ React Compiler با propsِ
  // هم‌مرجع کارت‌های فرم را دوباره رندر نمی‌کرد و خطای «ذخیره» دیده نمی‌شد (docs 08).
  "use no memo";
  const navigate = useNavigate();
  const { can } = usePermission();
  const canViewStatement = can("PartyStatementView");
  const canViewInstallments = can("SaleInstallmentView");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateMutation = useUpdateCustomerMutation();
  const deleteMutation = useDeleteCustomerMutation();

  const {
    formMethods,
    balanceType,
    imageUpload,
    buildCustomerPayload,
  } = useCustomerForm(customerData);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = formMethods;

  const onSubmit = (data) => {
    updateMutation.mutate(
      { id: customerData.id, data: buildCustomerPayload(data) },
      {
        onSuccess: () => {
          // سرور تصویرِ قبلی را خودکار پاک نمی‌کند (بخش ۱۷ سند)؛ حالا که
          // ویرایش ثبت شده، پاک‌کردنش امن است.
          imageUpload.commit();
          navigate(ROUTES.CUSTOMERS);
        },
      },
    );
  };

  const handleCancel = () => {
    imageUpload.discard();
    navigate(ROUTES.CUSTOMERS);
  };

  const handleDelete = () => {
    deleteMutation.mutate(customerData.id, {
      onSuccess: () => navigate(ROUTES.CUSTOMERS),
    });
  };

  const isBusy =
    updateMutation.isPending || deleteMutation.isPending || imageUpload.isUploading;

  return (
    <div className="m-auto bg-background">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">
          <div className="lg:col-span-1 space-y-4">
            <CustomerIdentityForm
              register={register}
              control={control}
              errors={errors}
              imageUpload={imageUpload}
            />
            <PartyFinanceForm
              side="customer"
              errors={errors}
              balanceType={balanceType}
              control={control}
            />
          </div>

          <div className="lg:col-span-1 space-y-4">
            <PartyAddressForm
              register={register}
              control={control}
              errors={errors}
              watch={watch}
              setValue={setValue}
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isBusy}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
              <Button type="submit" disabled={isBusy} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {isBusy ? "در حال ثبت..." : "ویرایش مشتری"}
              </Button>
            </div>

            <Button
              type="button"
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isBusy}
            >
              <Trash2 className="h-4 w-4" />
              حذف مشتری
            </Button>
          </div>
        </div>
      </form>

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <PartyOnAccountBar customerId={customerData.id} />
      </div>

      {/* گردش حساب از دفتر حساب اشخاص؛ مانده‌ی بالای فرم «مانده‌ی اولیه»ِ دستی است. */}
      {canViewStatement && (
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <PartyStatementCard
            customerId={customerData.id}
            totalBalance={partyBalanceOf(customerData)}
            openingBalance={openingBalanceOf(customerData)}
          />
        </div>
      )}

      {canViewInstallments && (
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <CustomerInstallmentsCard customerId={customerData.id} />
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="حذف مشتری"
        description={`آیا از حذف ${customerData.firstName} ${customerData.lastName} اطمینان دارید؟ این عملیات غیرقابل بازگشت است.`}
        confirmLabel="حذف"
        pendingLabel="در حال حذف..."
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: customer,
    isLoading,
    isError,
    error: loadError,
    refetch: retryLoad,
  } = useCustomerQuery(id);

  usePageHeader({
    title: isLoading
      ? "در حال بارگذاری..."
      : customer
        ? `ویرایش مشتری: ${customer.firstName} ${customer.lastName}`
        : "خطا",
    showBack: true,
  });

  if (isLoading) return <PartyDetailLoading />;

  if (isError || !customer) {
    return (
      <DetailErrorState
        error={loadError}
        notFoundMessage="مشتری مورد نظر یافت نشد."
        onRetry={retryLoad}
        onBack={() => navigate(ROUTES.CUSTOMERS)}
      />
    );
  }

  return (
    <>
      <AuditHistoryButton
        entityType="Customer"
        entityKey={customer.id}
        title={`مشتری ${customer.firstName} ${customer.lastName}`}
      />
      <CustomerDetailForm key={customer.id} customerData={customer} />
    </>
  );
}