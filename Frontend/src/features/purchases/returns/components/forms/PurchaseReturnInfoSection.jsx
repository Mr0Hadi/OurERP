import ReturnInfoSection from "@/shared/components/forms/ReturnInfoSection";
import { PURCHASE_RETURN_REASON_LABELS } from "../../services/mockData";

export default function PurchaseReturnInfoSection({ formData, onFormChange }) {
  return (
    <ReturnInfoSection
      formData={formData}
      onFormChange={onFormChange}
      reasonLabels={PURCHASE_RETURN_REASON_LABELS}
      dateLabel="تاریخ مرجوعی"
    />
  );
}
