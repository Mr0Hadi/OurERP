import { useNavigate } from "react-router-dom";
import PartyPickerCard from "@/shared/components/forms/PartyPickerCard";
import { ROUTES } from "@/shared/constants/routes";

/**
 * props:
 *  suppliers  - آرایه { id, companyName, firstName, lastName, image }
 *  isLoading  - وضعیت لود لیست تامین‌کنندگان
 *  selectedId - مقدار فعلی
 *  onSelect   - (id, name) => void
 *  onClear    - () => void
 *  error      - پیام خطا
 */
export default function PurchaseSupplierSection({
  suppliers = [],
  isLoading,
  selectedId,
  onSelect,
  onClear,
  error,
}) {
  const navigate = useNavigate();

  return (
    <PartyPickerCard
      parties={suppliers}
      isLoading={isLoading}
      selectedId={selectedId}
      onSelect={onSelect}
      onClear={onClear}
      error={error}
      title="تامین‌کننده"
      addNewLabel="افزودن تامین‌کننده جدید"
      onAddNew={() =>
        navigate(ROUTES.SUPPLIERS_NEW, {
          state: { returnTo: ROUTES.PURCHASES_NEW },
        })
      }
      emptyListText="لیست تامین‌کنندگان خالی است"
      notFoundText="تامین‌کننده‌ای یافت نشد"
    />
  );
}
