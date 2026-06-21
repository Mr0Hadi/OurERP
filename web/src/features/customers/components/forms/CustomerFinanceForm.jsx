import { CreditCard, AlertCircle } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

export default function CustomerFinanceForm({ register, errors, balanceType, setValue }) {
  return (
    <Card className="border-muted/60 shadow-sm">
      <CardHeader className="border-b border-muted/40 bg-muted/10 pb-4">
        <CardTitle className="flex items-center text-lg font-semibold text-foreground/90">
          <CreditCard className="ml-2 h-5 w-5 text-primary" />
          وضعیت مالی
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground/80">وضعیت حساب</Label>
          <Select value={balanceType} onValueChange={(val) => setValue("balanceType", val)}>
            <SelectTrigger className="h-10 focus:ring-primary/30">
              <SelectValue placeholder="وضعیت را انتخاب کنید" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بی‌حساب (صفر)</SelectItem>
              <SelectItem value="creditor">طلبکار (از ما طلب دارد)</SelectItem>
              <SelectItem value="debtor">بدهکار (به ما بدهکار است)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {balanceType !== "none" && (
          <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2 duration-200">
            <Label htmlFor="balanceAmount" className="text-sm font-medium text-foreground/80">
              مبلغ (تومان) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="balanceAmount"
                type="number"
                min="0"
                placeholder="0"
                dir="ltr"
                className="h-10 pl-12 focus-visible:ring-primary/30"
                {...register("balanceAmount", { required: "وارد کردن مبلغ الزامی است" })}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-xs text-muted-foreground">
                تومان
              </div>
            </div>
            {errors.balanceAmount && (
              <span className="text-xs text-destructive block mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.balanceAmount.message}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
