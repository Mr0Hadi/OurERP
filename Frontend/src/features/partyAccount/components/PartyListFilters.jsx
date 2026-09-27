import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";

import { BALANCE_QUICK_FILTERS } from "../store/createPartyFilterStore";

function Field({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <Label className="whitespace-nowrap font-light text-foreground">{label}</Label>
      {children}
    </div>
  );
}

const toPriceValue = (value) => (value === "" ? null : Number(value));

/**
 * فیلترهای لیستِ طرف‌حساب (مشتری/تامین‌کننده): جست‌وجو، شناسه، بازه‌ی مانده و
 * میان‌برهای بدهکار/بستانکار. واژه‌ها همان واژه‌های ستونِ «مانده حساب» جدول‌اند.
 *
 * @param {object} props
 * @param {Function} props.useStore خروجیِ `createPartyFilterStore`
 * @param {string} props.searchKey نامِ فیلدِ جست‌وجوی متنی در استور
 * @param {string} props.searchPlaceholder
 */
export default function PartyListFilters({ useStore, searchKey, searchPlaceholder }) {
  const search = useStore((s) => s[searchKey]);
  const id = useStore((s) => s.id);
  const minBalance = useStore((s) => s.minBalance);
  const maxBalance = useStore((s) => s.maxBalance);
  const balanceType = useStore((s) => s.balanceType);
  const { setSearch, setId, setBalanceRange, setQuickFilter, resetFilters } = useStore.getState();

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="sm:col-span-2">
          <Field label="جستجو">
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
          </Field>
        </div>
        <Field label="شناسه">
          <Input
            placeholder="مثال: ۴۲"
            value={id}
            // فقط رقم — سرور `id` را عددی می‌خواهد؛ غیرِ آن بایند نمی‌شود و فیلتر بی‌صدا نادیده گرفته می‌شود.
            onChange={(e) => setId(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            className="flex-1"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-border">
        <Field label="حداقل مانده (ریال)">
          <PriceInput
            placeholder="از"
            value={toPriceValue(minBalance)}
            onValueChange={(next) => setBalanceRange(next ?? "", maxBalance)}
            className="flex-1"
          />
        </Field>
        <Field label="حداکثر مانده (ریال)">
          <PriceInput
            placeholder="تا"
            value={toPriceValue(maxBalance)}
            onValueChange={(next) => setBalanceRange(minBalance, next ?? "")}
            className="flex-1"
          />
        </Field>

        <div className="flex flex-wrap gap-2" role="group" aria-label="نوع مانده">
          {BALANCE_QUICK_FILTERS.map((option) => {
            const active = String(balanceType) === String(option.balanceType);
            return (
              <Button
                key={option.key}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                onClick={() => setQuickFilter(option.balanceType)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-col items-end justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            className="w-full sm:w-auto px-4 mt-2"
          >
            حذف همه فیلترها
          </Button>
        </div>
      </div>
    </div>
  );
}
