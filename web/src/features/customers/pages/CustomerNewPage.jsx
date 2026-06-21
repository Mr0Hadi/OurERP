import { useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { useCreateCustomerMutation } from "../services/mutations";
import { Button } from "@/shared/components/ui/button";
import CustomerIdentityForm from "../components/forms/CustomerIdentityForm";
import CustomerFinanceForm from "../components/forms/CustomerFinanceForm";
import CustomerAddressForm from "../components/forms/CustomerAddressForm";
import { useCustomerForm } from "../hooks/useCustomerForm";
import { useHeaderStore } from "@/shared/store/headerStore";
import { useEffect } from "react";

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

  // استفاده از هوک جدید فرم که همه چیز (پیش‌فرض‌ها، آواتار و متدهای form) را مدیریت می‌کند
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
    // هوک مقادیر ارسالی را به درستی می‌سازد و نیازی به مدیریت دستی عکس در اینجا نیست
    const payload = buildCustomerPayload(data);
    createMutation.mutate(payload, { onSuccess: () => navigate("/customers") });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <CustomerAddressForm register={register} />

        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/customers")}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              "در حال ثبت..."
            ) : (
              <>
                <Save className="ml-2 h-4 w-4" />
                ثبت مشتری
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
