// src/features/customers/pages/CustomerNewPage.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";
import { useCreateCustomerMutation } from "../services/mutations";
import { useCustomerForm } from "../hooks/useCustomerForm";
import { useHeaderStore } from "@/shared/store/headerStore";
import { Button } from "@/shared/components/ui/button";
import CustomerIdentityForm from "../components/forms/CustomerIdentityForm";
import CustomerFinanceForm from "../components/forms/CustomerFinanceForm";
import CustomerAddressForm from "../components/forms/CustomerAddressForm";

export default function CustomerNewPage() {
  const navigate = useNavigate();
  const createMutation = useCreateCustomerMutation();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  useEffect(() => {
    setHeader({
      title: "اضافه کردن مشتری جدید",
      showBack: true,
      onBack: () => navigate(-1),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader]);

  const {
    formMethods,
    balanceType,
    avatarPreview,
    handleAvatarChange,
    handleRemoveAvatar,
    buildCustomerPayload,
  } = useCustomerForm();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = formMethods;

  const onSubmit = (data) => {
    createMutation.mutate(buildCustomerPayload(data), {
      onSuccess: () => navigate(-1),
    });
  };

  const isBusy = createMutation.isPending;

  return (
    <div className="m-auto bg-background">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">
          {/* ستون راست - اطلاعات اصلی */}
          <div className="lg:col-span-1 space-y-4">
            <CustomerIdentityForm
              register={register}
              errors={errors}
              control={control}
              avatarPreview={avatarPreview}
              onAvatarChange={handleAvatarChange}
              onRemoveAvatar={handleRemoveAvatar}
            />

            <CustomerFinanceForm
              register={register}
              errors={errors}
              control={control}
              balanceType={balanceType}
            />
          </div>

          {/* ستون چپ - آدرس و دکمه‌ها */}
          <div className="lg:col-span-1 space-y-4">
            <CustomerAddressForm register={register} errors={errors} />

            {/* دکمه‌های عملیات */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isBusy}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
              <Button type="submit" disabled={isBusy} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {isBusy ? "در حال ثبت..." : "ثبت مشتری"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
