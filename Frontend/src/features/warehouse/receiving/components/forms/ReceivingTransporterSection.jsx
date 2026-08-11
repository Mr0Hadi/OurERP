import TransporterSection from "@/shared/components/forms/TransporterSection";

export default function ReceivingTransporterSection({
  formData,
  onFormChange,
  error,
}) {
  return (
    <TransporterSection
      title="اطلاعات تحویل‌دهنده"
      nameLabel="نام و نام خانوادگی راننده / تحویل‌دهنده"
      namePlaceholder="مثلاً: علی رضایی"
      name={formData.transporterName}
      onNameChange={(v) => onFormChange({ transporterName: v })}
      nationalId={formData.transporterNationalId}
      onNationalIdChange={(v) => onFormChange({ transporterNationalId: v })}
      plate={formData.vehiclePlate}
      onPlateChange={(v) => onFormChange({ vehiclePlate: v })}
      plateHint="اگر کالا با پیک یا حضوری تحویل داده شده و پلاکی در کار نیست، این بخش را خالی بگذارید."
      resetKey={formData.purchaseId}
      error={error}
    />
  );
}
