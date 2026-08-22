import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";

/**
 * تاریخ و توضیحات مرجوعی.
 *
 * «دلیل اصلی سند» وجود ندارد. دلیل روی خودِ ادعا می‌نشیند، چون یک
 * مرجوعی می‌تواند چند ادعا با مشکل‌های کاملاً متفاوت داشته باشد و یک
 * دلیلِ سراسری برای سند، یا تکراری است یا دروغ.
 */
export default function PurchaseReturnInfoSection({ formData, onFormChange }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اطلاعات مرجوعی
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">تاریخ درخواست</Label>
          <PersianDatePicker
            value={formData.returnDate}
            onChange={(value) => onFormChange({ returnDate: value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            توضیحات (اختیاری)
          </Label>
          <Textarea
            value={formData.description || ""}
            onChange={(e) => onFormChange({ description: e.target.value })}
            placeholder="خلاصه‌ی گفت‌وگو با تامین‌کننده، توافق‌ها، یا هر چیزی که بعداً لازم می‌شود..."
            rows={3}
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
