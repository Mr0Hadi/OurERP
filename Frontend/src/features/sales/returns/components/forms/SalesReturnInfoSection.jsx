import ReturnInfoSection from "@/shared/components/forms/ReturnInfoSection";
import { SALES_RETURN_REASON_LABELS } from "../../services/mockData";

export default function SalesReturnInfoSection({ formData, onFormChange }) {
  return (
    <ReturnInfoSection
      formData={formData}
      onFormChange={onFormChange}
      reasonLabels={SALES_RETURN_REASON_LABELS}
      dateLabel="تاریخ درخواست"
    />
  );
}
