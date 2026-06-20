import { CreditCard } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

export default function CustomerFinanceForm({ register, errors, balanceType, setValue }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <CreditCard className="ml-2 h-5 w-5" />
          وضعیت مالی
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>وضعیت حساب</Label>
          <Select value={balanceType} onValueChange={(val) => setValue("balanceType", val)}>
            <SelectTrigger>
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
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <Label htmlFor="balanceAmount">مبلغ (تومان)</Label>
            <Input
              id="balanceAmount"
              type="number"
              min="0"
              dir="ltr"
              {...register("balanceAmount", { required: "وارد کردن مبلغ الزامی است" })}
            />
            {errors.balanceAmount && <span className="text-sm text-red-500">{errors.balanceAmount.message}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
