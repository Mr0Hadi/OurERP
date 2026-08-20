import { useNavigate } from "react-router-dom";
import PartyPickerCard from "@/shared/components/forms/PartyPickerCard";
import { ROUTES } from "@/shared/constants/routes";

/**
 * props:
 *  customers  - آرایه { id, companyName, firstName, lastName, image }
 *  isLoading  - وضعیت لود لیست مشتریان
 *  selectedId - مقدار فعلی
 *  onSelect   - (id, name) => void
 *  onClear    - () => void
 *  error      - پیام خطا
 */
export default function SaleCustomerSection({
  customers = [],
  isLoading,
  selectedId,
  onSelect,
  onClear,
  error,
}) {
  const navigate = useNavigate();

  return (
    <PartyPickerCard
      parties={customers}
      isLoading={isLoading}
      selectedId={selectedId}
      onSelect={onSelect}
      onClear={onClear}
      error={error}
      title="مشتری"
      addNewLabel="افزودن مشتری جدید"
      onAddNew={() =>
        navigate(ROUTES.CUSTOMERS_NEW, { state: { returnTo: ROUTES.SALES_NEW } })
      }
      emptyListText="لیست مشتریان خالی است"
      notFoundText="مشتری‌ای یافت نشد"
    />
  );
}
