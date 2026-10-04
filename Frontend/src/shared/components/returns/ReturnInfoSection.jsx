import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";

/**
 * تاریخ و توضیحاتِ مرجوعی در صفحه‌ی ثبت — مشترکِ خرید و فروش.
 *
 * «دلیلِ اصلیِ سند» عمداً نیست: دلیل روی خودِ ادعاست، چون یک مرجوعی
 * می‌تواند چند ادعا با مشکل‌ها و مقصرهای متفاوت داشته باشد.
 *
 * @param counterparty «تامین‌کننده» یا «مشتری» (`side.counterparty`)
 */
export default function ReturnInfoSection({ formData, onFormChange, counterparty }) {
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
          <Label htmlFor="return-description" className="text-xs text-muted-foreground">
            توضیحات (اختیاری)
          </Label>
          <Textarea
            id="return-description"
            value={formData.description || ""}
            onChange={(e) => onFormChange({ description: e.target.value })}
            placeholder={`خلاصه‌ی گفت‌وگو با ${counterparty}، توافق‌ها، یا هر چیزی که بعداً لازم می‌شود...`}
            rows={3}
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
