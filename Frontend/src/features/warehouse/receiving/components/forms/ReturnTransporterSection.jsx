import { Undo2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import TransporterSection from "@/shared/components/forms/TransporterSection";

/**
 * همان کارت تحویل‌دهنده‌ی دریافت خرید، با برچسب عمومی‌تر «تحویل‌دهنده»
 * (این کالا می‌تواند با پیک، وسیله‌ی شخصی مشتری، یا حضوری خودِ مشتری
 * برگردد) و یک نشان «نوع دریافت: مرجوعی فروش» تا برای انباردار روشن
 * باشد این دریافت از چه نوعی است.
 */
export default function ReturnTransporterSection({
  formData,
  onFormChange,
  error,
}) {
  return (
    <TransporterSection
      title="اطلاعات تحویل‌دهنده"
      headerBadge={
        <Badge
          variant="secondary"
          className="gap-1.5 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
        >
          <Undo2 className="h-3.5 w-3.5" />
          نوع دریافت: مرجوعی فروش
        </Badge>
      }
      nameLabel="نام و نام خانوادگی تحویل‌دهنده"
      namePlaceholder="مثلاً: علی رضایی (پیک) یا خودِ مشتری"
      name={formData.transporterName}
      onNameChange={(v) => onFormChange({ transporterName: v })}
      nationalId={formData.transporterNationalId}
      onNationalIdChange={(v) => onFormChange({ transporterNationalId: v })}
      plate={formData.vehiclePlate}
      onPlateChange={(v) => onFormChange({ vehiclePlate: v })}
      plateHint="اگر کالا حضوری یا بدون خودرو تحویل داده شده، این بخش را خالی بگذارید."
      resetKey={formData.returnId}
      error={error}
    />
  );
}
