// src/features/purchases/components/PurchaseInfoSection.jsx
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

/**
 * props: register, errors
 */
export default function SaleInfoSection({ register, errors }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اطلاعات فاکتور
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* شماره فاکتور */}
        <div className="space-y-1.5">
          <Label
            htmlFor="invoiceNumber"
            className="text-sm font-medium text-card-foreground"
          >
            شماره فاکتور
          </Label>
          <Input
            id="invoiceNumber"
            placeholder="مثال: INV-1023"
            {...register("invoiceNumber", { required: "شماره فاکتور الزامی است" })}
            className={`input-rtl-placeholder h-9 ${
              errors.invoiceNumber ? "border-destructive focus-visible:ring-destructive/30" : ""
            }`}
          />
          {errors.invoiceNumber && (
            <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>
          )}
        </div>

        {/* تاریخ فاکتور */}
        <div className="space-y-1.5">
          <Label
            htmlFor="invoiceDate"
            className="text-sm font-medium text-card-foreground"
          >
            تاریخ فاکتور
          </Label>
          <Input
            id="invoiceDate"
            type="date"
            {...register("invoiceDate", { required: "تاریخ الزامی است" })}
            className={`h-9 ${
              errors.invoiceDate ? "border-destructive focus-visible:ring-destructive/30" : ""
            }`}
          />
          {errors.invoiceDate && (
            <p className="text-xs text-destructive">{errors.invoiceDate.message}</p>
          )}
        </div>

        {/* تاریخ سررسید */}
        <div className="space-y-1.5">
          <Label
            htmlFor="dueDate"
            className="text-sm font-medium text-card-foreground"
          >
            تاریخ سررسید
          </Label>
          <Input
            id="dueDate"
            type="date"
            {...register("dueDate")}
            className="h-9"
          />
        </div>

        {/* توضیحات */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label
            htmlFor="description"
            className="text-sm font-medium text-card-foreground"
          >
            توضیحات
          </Label>
          <Textarea
            id="description"
            placeholder="یادداشت یا توضیحات اضافه..."
            rows={3}
            {...register("description")}
            className="input-rtl-placeholder resize-none text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
