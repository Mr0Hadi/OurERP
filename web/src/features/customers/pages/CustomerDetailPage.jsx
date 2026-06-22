// src/features/customers/pages/CustomerDetailPage.jsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { useCustomerQuery } from "../services/queries";
import { useUpdateCustomerMutation } from "../services/mutations";
import { useHeaderStore } from "#/shared/store/headerStore";
import { Button } from "@/shared/components/ui/button";
import CustomerDetailLoading from "../components/forms/CustomerDetailLoading";
import { useCustomerForm } from "../hooks/useCustomerForm";
import CustomerIdentityForm from "../components/forms/CustomerIdentityForm";
import CustomerFinanceForm from "../components/forms/CustomerFinanceForm";
import CustomerAddressForm from "../components/forms/CustomerAddressForm";

function CustomerDetailForm({ customerData }) {
  const navigate = useNavigate();
  const updateMutation = useUpdateCustomerMutation();

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
      { onSuccess: () => navigate("/customers") }
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

          {/* ستون چپ - اطلاعات مالی و دکمه‌ها */}
          <div className="lg:col-span-1 space-y-4">
            <CustomerAddressForm register={register} />

            {/* دکمه‌های عملیات - استیکی در دسکتاپ */}
            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/customers")}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isBusy}>
                {isBusy ? (
                  "در حال ذخیره..."
                ) : (
                  <>
                    <Save className="ml-2 h-4 w-4" />
                    ذخیره تغییرات
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
        ? `ویرایش تامین‌کننده: ${`${customer.firstName} ${customer.lastName}`}`
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
