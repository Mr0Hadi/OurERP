// src/features/suppliers/pages/SupplierNewPage.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { useCreateSupplierMutation } from "../services/mutations";
import { useSupplierForm } from "../hooks/useSupplierForm";
import { useHeaderStore } from "@/shared/store/headerStore";
import { Button } from "@/shared/components/ui/button";
import SupplierIdentityForm from "../components/forms/SupplierIdentityForm";
import SupplierFinanceForm from "../components/forms/SupplierFinanceForm";
import SupplierAddressForm from "../components/forms/SupplierAddressForm";

export default function SupplierNewPage() {
  const navigate = useNavigate();
  const createMutation = useCreateSupplierMutation();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  useEffect(() => {
    setHeader({
      title: "اضافه کردن تامین کننده جدید",
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
    buildSupplierPayload,
  } = useSupplierForm();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = formMethods;

  const onSubmit = (data) => {
    createMutation.mutate(buildSupplierPayload(data), {
      onSuccess: () => navigate("/suppliers"),
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

          {/* ستون چپ - آدرس و دکمه‌ها */}
          <div className="lg:col-span-1 space-y-4">
            <SupplierAddressForm register={register} />

            {/* دکمه‌های عملیات */}
            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/suppliers")}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isBusy}>
                {isBusy ? (
                  "در حال ثبت..."
                ) : (
                  <>
                    <Save className="ml-2 h-4 w-4" />
                    ثبت تامین کننده
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
