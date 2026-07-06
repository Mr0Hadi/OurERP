// src/features/suppliers/pages/SupplierDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, AlertCircle, X, Trash2 } from "lucide-react";
import {
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} from "../services/mutations";
import { useSupplierQuery } from "../services/queries";
import { useSupplierForm } from "../hooks/useSupplierForm";
import { useHeaderStore } from "@/shared/store/headerStore";
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
import SupplierIdentityForm from "../components/forms/SupplierIdentityForm";
import SupplierFinanceForm from "../components/forms/SupplierFinanceForm";
import SupplierAddressForm from "../components/forms/SupplierAddressForm";
import SupplierDetailLoading from "../components/forms/SupplierDetailLoading";
import { ROUTES } from "@/shared/constants/routes";

function SupplierDetailForm({ supplierData }) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateMutation = useUpdateSupplierMutation();
  const deleteMutation = useDeleteSupplierMutation();

  const {
    formMethods,
    balanceType,
    avatarPreview,
    handleAvatarChange,
    handleRemoveAvatar,
    buildSupplierPayload,
  } = useSupplierForm(supplierData);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = formMethods;

  const onSubmit = (data) => {
    updateMutation.mutate(
      { id: supplierData.id, data: buildSupplierPayload(data, avatarPreview) },
      { onSuccess: () => navigate(ROUTES.SUPPLIERS) }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(supplierData.id, {
      onSuccess: () => navigate(ROUTES.SUPPLIERS),
    });
  };

  const isBusy = updateMutation.isPending || deleteMutation.isPending;

  const supplierDisplayName =
    supplierData.companyName ||
    `${supplierData.firstName} ${supplierData.lastName}`;

  return (
    <div className="m-auto bg-background">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">
          <div className="lg:col-span-1 space-y-4">
            <SupplierIdentityForm
              register={register}
              errors={errors}
              avatarPreview={avatarPreview}
              onAvatarChange={handleAvatarChange}
              onRemoveAvatar={handleRemoveAvatar}
            />
            <SupplierFinanceForm
              register={register}
              errors={errors}
              balanceType={balanceType}
              setValue={setValue}
            />
          </div>

          <div className="lg:col-span-1 space-y-4">
            <SupplierAddressForm register={register} />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.SUPPLIERS)}
                disabled={isBusy}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
              <Button type="submit" disabled={isBusy} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {isBusy ? "در حال ثبت..." : "ویرایش تامین کننده"}
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
              حذف تامین‌کننده
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف تامین‌کننده</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف {supplierDisplayName} اطمینان دارید؟ این عملیات غیرقابل
              بازگشت است.
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

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: supplier, isLoading, isError } = useSupplierQuery(id);

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : supplier
        ? `ویرایش تامین‌کننده: ${
            supplier.companyName || `${supplier.firstName} ${supplier.lastName}`
          }`
        : "خطا",
      showBack: true,
      onBack: () => navigate(-1),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, supplier, isLoading]);

  if (isLoading) return <SupplierDetailLoading />;

  if (isError || !supplier) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          تامین‌کننده مورد نظر یافت نشد یا خطایی رخ داده است.
        </p>
        <Button variant="outline" onClick={() => navigate(ROUTES.SUPPLIERS)}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return <SupplierDetailForm key={supplier.id} supplierData={supplier} />;
}
