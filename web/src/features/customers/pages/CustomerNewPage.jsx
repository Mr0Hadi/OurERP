import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { useCreateCustomerMutation } from "../services/mutations";
import { Button } from "@/shared/components/ui/button";
import CustomerIdentityForm from "../components/forms/CustomerIdentityForm";
import CustomerFinanceForm from "../components/forms/CustomerFinanceForm";
import CustomerAddressForm from "../components/forms/CustomerAddressForm";
import {
  buildCustomerPayload,
  defaultCustomerValues,
} from "../hooks/useCustomerForm";
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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: defaultCustomerValues,
  });

  const balanceType = watch("balanceType");

  const onSubmit = (data) => {
    const payload = {
      ...buildCustomerPayload(data),
      avatar: data.avatar?.[0] ? URL.createObjectURL(data.avatar[0]) : null,
    };
    createMutation.mutate(payload, { onSuccess: () => navigate("/customers") });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <CustomerIdentityForm register={register} errors={errors} />
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
