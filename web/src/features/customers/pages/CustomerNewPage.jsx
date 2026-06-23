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
    setValue,
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

          {/* ستون چپ - آدرس و دکمه‌ها */}
          <div className="lg:col-span-1 space-y-4">
            <CustomerAddressForm register={register} />

            {/* دکمه‌های عملیات */}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/customers')}
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
