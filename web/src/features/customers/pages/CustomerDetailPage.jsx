import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { useCustomerQuery } from "../services/queries";
import { useUpdateCustomerMutation } from "../services/mutations";
import { useHeaderStore } from "#/shared/store/headerStore";
import { Button } from "@/shared/components/ui/button";
import CustomerDetailLoading from "../components/CustomerDetailLoading";
import { useCustomerForm } from "../hooks/useCustomerForm";
import CustomerIdentityForm from "../components/forms/CustomerIdentityForm";
import CustomerFinanceForm from "../components/forms/CustomerFinanceForm";
import CustomerAddressForm from "../components/forms/CustomerAddressForm";

function CustomerDetailForm({ customerData }) {
  const navigate = useNavigate();
  const updateMutation = useUpdateCustomerMutation();

  const { formMethods, balanceType, buildCustomerPayload } = useCustomerForm(customerData);

  const { register, handleSubmit, setValue, formState: { errors } } = formMethods;

  const onSubmit = (data) => {
    updateMutation.mutate(
      { id: customerData.id, data: buildCustomerPayload(data) },
      { onSuccess: () => navigate("/customers") }
    );
  };

  const isBusy = updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <CustomerIdentityForm register={register} errors={errors} />
        <CustomerFinanceForm 
          register={register} 
          errors={errors} 
          balanceType={balanceType} 
          setValue={setValue} 
        />
        <CustomerAddressForm register={register} />

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate("/customers")}>
            انصراف
          </Button>
          <Button type="submit" disabled={isBusy}>
            {isBusy ? "در حال ذخیره..." : <><Save className="ml-2 h-4 w-4" />ذخیره تغییرات</>}
          </Button>
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

  useEffect(() => {
    setHeader({ title: "جزئیات و ویرایش مشتری", showBack: true, onBack: () => navigate(-1) });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader]);

  const { data: customer, isLoading, isError } = useCustomerQuery(id);

  if (isLoading || !customer) return <CustomerDetailLoading />;
  if (isError) return <div className="text-center py-20 text-red-500">مشکلی در دریافت اطلاعات مشتری به وجود آمد.</div>;

  return <CustomerDetailForm key={customer.id} customerData={customer} />;
}
