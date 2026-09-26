import { useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import { UNIT_CUSTODY_REASON_LABELS } from "@/shared/domain/enums/unitStatus";

import { UNIT_SEGMENTS, fa } from "../domain/unitVocabulary";
import UnitActiveFilters from "./UnitActiveFilters";

const CUSTODY_OPTIONS = Object.entries(UNIT_CUSTODY_REASON_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
      {/* برچسبِ داخلیِ فیلدهای مشترک تکراری است؛ فقط برای صفحه‌خوان می‌ماند. */}
      <div className="[&_label]:sr-only">{children}</div>
    </div>
  );
}

/**
 * فیلترهای فهرستِ دانه‌ها (جایگاه و برچسب در `UnitViewNav` است). ردیفِ اول
 * فیلدِ جست‌وجو/اسکن (`search`)، انتخابِ کالا و دکمه‌ی فیلترهاست. بقیه (طرفِ حساب، تاریخ، سریال، علتِ قرنطینه)
 * پشتِ «فیلترهای بیشتر»؛ وقتی بسته است، فیلترهای فعالش به شکلِ برچسبِ
 * قابلِ حذف زیرِ ردیف دیده می‌شوند تا کاربر بداند چرا فهرست کوتاه شده.
 */
export default function UnitFilterBar({
  store,
  search,
  products,
  suppliers,
  customers,
  isLoadingParties,
}) {
  const [showMore, setShowMore] = useState(false);
  const isQuarantine = store.segment === UNIT_SEGMENTS.QUARANTINE;

  const advancedActive = [
    store.supplierId,
    store.customerId,
    store.fromDate || store.toDate,
    store.fromSerial || store.toSerial,
    isQuarantine && store.custodyReason,
  ].filter(Boolean).length;

  const anyActive =
    advancedActive > 0 ||
    store.productId ||
    store.search ||
    store.purchaseId ||
    store.saleId;

  return (
    <div className="@container/filters space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 basis-full flex-1">{search}</div>

        {/* در عرضِ کافی کالا در ستونِ کناری است. برچسبِ داخلیِ EntitySelect اینجا جا نمی‌شود. */}
        <div className="min-w-0 flex-1 [&_label]:sr-only">
          <EntitySelect
            label="کالا"
            placeholder="همه‌ی کالاها"
            emptyText="کالایی یافت نشد"
            items={products}
            value={store.productId}
            onSelect={(id) => store.setProductId(id)}
            renderMeta={(product) => product.code}
          />
        </div>

        <div className="ms-auto flex h-11 shrink-0 items-center gap-1 lg:ms-0">
          <Button
            type="button"
            variant={showMore ? "secondary" : "outline"}
            className="h-10 gap-1.5"
            aria-expanded={showMore}
            onClick={() => setShowMore((open) => !open)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">فیلترهای بیشتر</span>
            <span className="sm:hidden">فیلترها</span>
            {advancedActive > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground tabular-nums">
                {fa(advancedActive)}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMore ? "rotate-180" : ""}`} />
          </Button>

          {anyActive && (
            <Button
              type="button"
              variant="ghost"
              className="h-10 gap-1 px-2.5 text-muted-foreground"
              onClick={() => {
                store.clearAdvanced();
                store.setSearch("");
              }}
              title="برداشتنِ جست‌وجو و فیلترها (نمای انتخاب‌شده می‌ماند)"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">پاک کردن</span>
            </Button>
          )}
        </div>
      </div>

      {showMore && (
        <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3 @lg/filters:grid-cols-2 @4xl/filters:grid-cols-4">
          <Field label="تامین‌کننده">
            <EntitySelect
              label="تامین‌کننده"
              placeholder="همه"
              items={suppliers}
              isLoading={isLoadingParties}
              value={store.supplierId}
              onSelect={(id) => store.setSupplierId(id)}
            />
          </Field>
          <Field label="مشتری">
            <EntitySelect
              label="مشتری"
              placeholder="همه"
              items={customers}
              isLoading={isLoadingParties}
              value={store.customerId}
              onSelect={(id) => store.setCustomerId(id)}
            />
          </Field>
          <Field label="تاریخ ورود به انبار">
            <div className="grid grid-cols-2 gap-2">
              <PersianDatePicker value={store.fromDate} onChange={store.setFromDate} placeholder="از" />
              <PersianDatePicker value={store.toDate} onChange={store.setToDate} placeholder="تا" />
            </div>
          </Field>
          <Field label={store.productId ? "بازه‌ی سریال" : "بازه‌ی سریال (اول کالا را انتخاب کنید)"}>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="از"
                disabled={!store.productId}
                value={store.fromSerial}
                onChange={(event) => store.setFromSerial(event.target.value)}
                className="h-9"
              />
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="تا"
                disabled={!store.productId}
                value={store.toSerial}
                onChange={(event) => store.setToSerial(event.target.value)}
                className="h-9"
              />
            </div>
          </Field>
          {isQuarantine && (
            <Field label="علت قرنطینه">
              <FilterSelect
                label="علت قرنطینه"
                value={store.custodyReason}
                onChange={store.setCustodyReason}
                options={CUSTODY_OPTIONS}
                numeric
              />
            </Field>
          )}
        </div>
      )}

      <UnitActiveFilters
        store={store}
        products={products}
        suppliers={suppliers}
        customers={customers}
        linksOnly={showMore}
      />
    </div>
  );
}
