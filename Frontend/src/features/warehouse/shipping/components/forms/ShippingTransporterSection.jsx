import TransporterSection from "@/shared/components/forms/TransporterSection";

/** `DriverFullName`/`DriverPhoneNumber`/`VehiclePlate` روی `ShipSaleCommand`. */
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
      name={formData.driverFullName}
      onNameChange={(v) => onFormChange({ driverFullName: v })}
      phone={formData.driverPhoneNumber}
      onPhoneChange={(v) => onFormChange({ driverPhoneNumber: v })}
      plate={formData.vehiclePlate}
      onPlateChange={(v) => onFormChange({ vehiclePlate: v })}
      plateHint="اگر کالا با پیک یا حضوری تحویل داده می‌شود و پلاکی در کار نیست، این بخش را خالی بگذارید."
      error={error}
    />
  );
}
