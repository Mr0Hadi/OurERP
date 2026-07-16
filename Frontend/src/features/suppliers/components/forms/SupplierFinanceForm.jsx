// src/features/suppliers/components/forms/SupplierFinanceForm.jsx
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

export default function SupplierFinanceForm({ register, errors, balanceType, setValue }) {
  const showAmount = balanceType !== "none";

  return (
    <Card className="shadow-md rounded-2xl overflow-hidden pt-0 gap-0">
      <CardHeader className="border-b bg-muted/30 py-4 px-6">
        <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wallet className="h-4.5 w-4.5 text-primary" />
          </div>
          وضعیت مالی
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 py-5 space-y-4">
        <div className={`grid gap-4 ${showAmount ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>

          {/* نوع حساب */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">نوع حساب</Label>
            <Select value={balanceType} onValueChange={(val) => setValue("balanceType", val)}>
              <SelectTrigger className="h-10 rounded-lg transition-all">
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                    بی‌حساب (صفر)
                  </div>
                </SelectItem>
                <SelectItem value="creditor" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-500" />
                    طلبکار
                  </div>
                </SelectItem>
                <SelectItem value="debtor" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-500" />
                    بدهکار
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* مبلغ */}
          {showAmount && (
            <div className="space-y-1.5 animate-in fade-in-50 slide-in-from-top-3 duration-300">
              <Label htmlFor="balanceAmount" className="text-sm font-medium">
                مبلغ (تومان) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="balanceAmount"
                  type="number"
                  min="0"
                  placeholder="۰"
                  dir="ltr"
                  className="h-10 pl-16 pr-3 rounded-lg transition-all text-base font-semibold input-rtl-placeholder"
                  {...register("balanceAmount", { required: "وارد کردن مبلغ الزامی است" })}
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-sm font-medium text-muted-foreground">
                  تومان
                </div>
              </div>
              {errors.balanceAmount && (
                <span className="text-xs text-destructive block mt-1 font-medium">
                  {errors.balanceAmount.message}
                </span>
              )}
            </div>
          )}

        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-sm font-medium">یادداشت‌ها</Label>
          <Textarea
            id="notes"
            placeholder="یادداشت‌ها..."
            className="min-h-[80px] rounded-lg transition-all resize-none"
            {...register("notes")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
