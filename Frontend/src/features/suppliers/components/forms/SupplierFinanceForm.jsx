// src/features/suppliers/components/forms/SupplierFinanceForm.jsx
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { Controller, useWatch } from "react-hook-form";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { PriceInput } from "@/shared/components/ui/price-input";
import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";
import { numberToPersianWords } from "@/shared/lib/number-to-persian-words";

export default function SupplierFinanceForm({ errors, balanceType, control }) {
  const showAmount = balanceType !== BalanceTypeEnum.BALANCED;
  const balanceAmount = useWatch({ control, name: "balanceAmount" });
  const balanceAmountWords =
    balanceAmount !== "" && balanceAmount != null
      ? numberToPersianWords(Number(balanceAmount) / 10, { suffix: "تومان" })
      : "";

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
      <CardContent className="px-6 py-5">
        <div className={`grid gap-4 ${showAmount ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>

          {/* نوع حساب */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">نوع حساب</Label>
            <Controller
              name="balanceType"
              control={control}
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(value) => field.onChange(Number(value))}
                >
                  <SelectTrigger className="h-10 rounded-lg transition-all">
                    <SelectValue placeholder="انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value={String(BalanceTypeEnum.BALANCED)} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                        تسویه شده (صفر)
                      </div>
                    </SelectItem>
                    <SelectItem value={String(BalanceTypeEnum.DEBTOR)} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-500" />
                        بدهکار به ما
                      </div>
                    </SelectItem>
                    <SelectItem value={String(BalanceTypeEnum.CREDITOR)} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-500" />
                        بستانکار (ما بدهکاریم)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* مبلغ */}
          {showAmount && (
            <div className="space-y-1.5 animate-in fade-in-50 slide-in-from-top-3 duration-300">
              <Label htmlFor="balanceAmount" className="text-sm font-medium">
                مبلغ (ریال) <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="balanceAmount"
                control={control}
                rules={{ required: "وارد کردن مبلغ الزامی است" }}
                render={({ field }) => (
                  <div className="relative">
                    <PriceInput
                      id="balanceAmount"
                      min={0}
                      value={field.value === "" || field.value == null ? null : Number(field.value)}
                      onValueChange={(next) => field.onChange(next ?? "")}
                      className="h-10 pl-16 pr-3 rounded-lg transition-all text-base font-semibold"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-sm font-medium text-muted-foreground">
                      ریال
                    </div>
                  </div>
                )}
              />
              {errors.balanceAmount ? (
                <span className="text-xs text-destructive block mt-1 font-medium">
                  {errors.balanceAmount.message}
                </span>
              ) : (
                balanceAmountWords && (
                  <p className="text-xs text-muted-foreground">{balanceAmountWords}</p>
                )
              )}
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}