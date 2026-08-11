import TransporterSection from "@/shared/components/forms/TransporterSection";

export default function ShippingTransporterSection({
  formData,
  onFormChange,
  error,
}) {
  return (
    <TransporterSection
      title="اطلاعات راننده / تحویل‌گیرنده"
      nameLabel="نام و نام خانوادگی راننده"
      namePlaceholder="مثلاً: علی رضایی"
      name={formData.driverName}
      onNameChange={(v) => onFormChange({ driverName: v })}
      nationalId={formData.driverNationalId}
      onNationalIdChange={(v) => onFormChange({ driverNationalId: v })}
      plate={formData.vehiclePlate}
      onPlateChange={(v) => onFormChange({ vehiclePlate: v })}
      plateHint="اگر کالا با پیک یا حضوری تحویل داده می‌شود و پلاکی در کار نیست، این بخش را خالی بگذارید."
      resetKey={formData.saleId}
      error={error}
    />
  );
}
