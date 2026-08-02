// src/features/sales/components/forms/SalesReturnInfoSection.jsx
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import { SALES_RETURN_REASON_LABELS } from "../../services/returns/mockData";

const REASON_OPTIONS = Object.entries(SALES_RETURN_REASON_LABELS);

export default function SalesReturnInfoSection({ formData, onFormChange }) {
  const handleChange = (field, value) => onFormChange({ [field]: value });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اطلاعات مرجوعی
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-card-foreground">تاریخ درخواست</Label>
          <PersianDatePicker
            value={formData.returnDate}
            onChange={(isoDate) => handleChange("returnDate", isoDate)}
            placeholder="مثال: ۱۴۰۵/۰۵/۰۲"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-card-foreground">دلیل اصلی مرجوعی</Label>
          <Select value={formData.reason} onValueChange={(v) => handleChange("reason", v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASON_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-sm font-medium text-card-foreground">توضیحات</Label>
          <Textarea
            placeholder="یادداشت یا توضیحات اضافه..."
            rows={3}
            value={formData.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            className="input-rtl-placeholder resize-none text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
