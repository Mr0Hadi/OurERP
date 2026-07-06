// src/features/customers/pages/CustomerDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, X, Trash2 } from "lucide-react";
import { useCustomerQuery } from "../services/queries";
import { useUpdateCustomerMutation, useDeleteCustomerMutation } from "../services/mutations";
import { useHeaderStore } from "#/shared/store/headerStore";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import CustomerDetailLoading from "../components/forms/CustomerDetailLoading";
import { useCustomerForm } from "../hooks/useCustomerForm";
import CustomerIdentityForm from "../components/forms/CustomerIdentityForm";
import CustomerFinanceForm from "../components/forms/CustomerFinanceForm";
import CustomerAddressForm from "../components/forms/CustomerAddressForm";
import { ROUTES } from "@/shared/constants/routes";

function CustomerDetailForm({ customerData }) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateMutation = useUpdateCustomerMutation();
  const deleteMutation = useDeleteCustomerMutation();

  const {
    formMethods,
    balanceType,
    avatarPreview,
    handleAvatarChange,
    handleRemoveAvatar,
    buildCustomerPayload,
  } = useCustomerForm(customerData);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = formMethods;

  const onSubmit = (data) => {
    updateMutation.mutate(
      { id: customerData.id, data: buildCustomerPayload(data) },
      { onSuccess: () => navigate(ROUTES.CUSTOMERS) }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(customerData.id, {
      onSuccess: () => navigate(ROUTES.CUSTOMERS),
    });
  };

  const isBusy = updateMutation.isPending || deleteMutation.isPending;

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
              errors={errors}
              avatarPreview={avatarPreview}
              onAvatarChange={handleAvatarChange}
              onRemoveAvatar={handleRemoveAvatar}
            />
            <CustomerFinanceForm
              register={register}
              errors={errors}
              balanceType={balanceType}
              setValue={setValue}
            />
          </div>

          <div className="lg:col-span-1 space-y-4">
            <CustomerAddressForm register={register} />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.CUSTOMERS)}
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مشتری</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف {customerData.firstName} {customerData.lastName} اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "در حال حذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: customer, isLoading, isError } = useCustomerQuery(id);

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : customer
        ? `ویرایش مشتری: ${customer.firstName} ${customer.lastName}`
        : "خطا",
      showBack: true,
      onBack: () => navigate(-1),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, customer, isLoading]);

  if (isLoading || !customer) return <CustomerDetailLoading />;
  if (isError)
    return (
      <div className="text-center py-20 text-destructive">
        مشکلی در دریافت اطلاعات مشتری به وجود آمد.
      </div>
    );

  return <CustomerDetailForm key={customer.id} customerData={customer} />;
}
