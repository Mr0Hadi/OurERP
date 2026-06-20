import { useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { useCustomerQuery } from "../services/queries";
import { useUpdateCustomerMutation } from "../services/mutations";
import { useHeaderStore } from "#/shared/store/headerStore";
import { Button } from "@/shared/components/ui/button";
import CustomerDetailLoading from "../components/CustomerDetailLoading";
import CustomerIdentityForm from "../components/forms/CustomerIdentityForm";
import CustomerFinanceForm from "../components/forms/CustomerFinanceForm";
import CustomerAddressForm from "../components/forms/CustomerAddressForm";
import { buildCustomerPayload, defaultCustomerValues } from "../hooks/useCustomerForm";

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
  const updateMutation = useUpdateCustomerMutation();

  const formValues = useMemo(() => {
    if (!customer) return undefined;
    let balanceType = "none", balanceAmount = "";
    if (customer.balance < 0) { balanceType = "debtor"; balanceAmount = Math.abs(customer.balance).toString(); }
    else if (customer.balance > 0) { balanceType = "creditor"; balanceAmount = Math.abs(customer.balance).toString(); }
    return {
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phone: customer.phone || "",
      address: customer.address || "",
      lat: customer.coordinates?.lat?.toString() || "",
      lng: customer.coordinates?.lng?.toString() || "",
      postalCode: customer.postalCode || "",
      balanceType,
      balanceAmount,
      avatar: null,
    };
  }, [customer]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: defaultCustomerValues,
    values: formValues,
  });

  const balanceType = watch("balanceType");

  const onSubmit = (data) => {
    updateMutation.mutate(
      { id, data: buildCustomerPayload(data) },
      { onSuccess: () => navigate("/customers") }
    );
  };

  if (isLoading) return <CustomerDetailLoading />;
  if (isError || !customer) return <div className="text-center py-20 text-red-500">مشکلی در دریافت اطلاعات مشتری به وجود آمد.</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <CustomerIdentityForm register={register} errors={errors} />
        <CustomerFinanceForm register={register} errors={errors} balanceType={balanceType} setValue={setValue} />
        <CustomerAddressForm register={register} />

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate("/customers")}>انصراف</Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "در حال ذخیره..." : <><Save className="ml-2 h-4 w-4" />ذخیره تغییرات</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
