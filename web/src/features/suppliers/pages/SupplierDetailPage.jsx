// src/features/suppliers/pages/SupplierDetailPage.jsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, AlertCircle, X } from "lucide-react";
import { useUpdateSupplierMutation } from "../services/mutations";
import { useSupplierQuery } from "../services/queries";
import { useSupplierForm } from "../hooks/useSupplierForm";
import { useHeaderStore } from "@/shared/store/headerStore";
import { Button } from "@/shared/components/ui/button";
import SupplierIdentityForm from "../components/forms/SupplierIdentityForm";
import SupplierFinanceForm from "../components/forms/SupplierFinanceForm";
import SupplierAddressForm from "../components/forms/SupplierAddressForm";
import SupplierDetailLoading from "../components/forms/SupplierDetailLoading";

// ============================================================
// کامپوننت فرم (مشابه CustomerDetailForm)
// ============================================================
function SupplierDetailForm({ supplierData }) {
  const navigate = useNavigate();
  const updateMutation = useUpdateSupplierMutation();

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
      { onSuccess: () => navigate("/suppliers") }
    );
  };

  const isBusy = updateMutation.isPending;

  return (
    <div className="m-auto bg-background">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">
          {/* ستون راست - اطلاعات اصلی */}
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

          {/* ستون چپ - اطلاعات مالی و دکمه‌ها */}
          <div className="lg:col-span-1 space-y-4">
            <SupplierAddressForm register={register} />

            {/* دکمه‌های عملیات */}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/suppliers")}
                disabled={isBusy}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
              <Button 
                type="submit" 
                disabled={isBusy}
                className="gap-2"
              >
                {isBusy ? (
                  "در حال ثبت..."
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    ثبت کالا
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// صفحه‌ی اصلی (مشابه CustomerDetailPage)
// ============================================================
export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  // دریافت اطلاعات تامین‌کننده
  const { data: supplier, isLoading, isError } = useSupplierQuery(id);

  // تنظیم هدر (عنوان پویا – تفاوت جزئی با مشتری)
  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : supplier
        ? `ویرایش تامین‌کننده: ${supplier.companyName || `${supplier.firstName} ${supplier.lastName}`}`
        : "خطا",
      showBack: true,
      onBack: () => navigate(-1),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, supplier, isLoading]);

  // حالت بارگذاری
  if (isLoading) {
    return <SupplierDetailLoading />;
  }

  // حالت خطا
  if (isError || !supplier) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          تامین‌کننده مورد نظر یافت نشد یا خطایی رخ داده است.
        </p>
        <Button variant="outline" onClick={() => navigate("/suppliers")}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  // رندر فرم با کلید یکتا برای بازسازی در صورت تغییر id
  return <SupplierDetailForm key={supplier.id} supplierData={supplier} />;
}