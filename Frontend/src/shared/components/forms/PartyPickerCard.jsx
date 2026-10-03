import { useId, useRef, useState } from "react";
import { Loader2, Pencil, Phone, Search, UserPlus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import SectionCard from "@/shared/components/documents/SectionCard";
import RemoteImage from "@/shared/components/files/RemoteImage";
import LedgerBalanceBadge from "@/features/partyAccount/components/LedgerBalanceBadge";
import { partyBalanceOf } from "@/features/partyAccount/domain/partyBalance";
import { partyDisplayName } from "@/features/partyAccount/domain/partyName";
import { formatNumber } from "@/shared/lib/numberFormat";

/** خطِ دومِ طرف حساب: نامِ مسئولِ شرکت. */
const contactNameOf = (party) =>
  party.companyName ? `${party.firstName ?? ""} ${party.lastName ?? ""}`.trim() : "";

/** بخش‌هایی از متن که با کلمه‌های جست‌وجو می‌خوانند، پررنگ. */
function Highlight({ text, words }) {
  if (!text || !words.length) return text;
  const pattern = new RegExp(
    `(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "g",
  );
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded-sm bg-primary/15 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function PartyAvatar({ party, size = "h-9 w-9" }) {
  const name = partyDisplayName(party);
  return (
    <RemoteImage
      imageKey={party.imageKey}
      imageUrl={party.imageUrl ?? party.image}
      alt={name}
      className={`${size} shrink-0 rounded-full border border-border object-cover`}
      fallback={
        <div
          className={`${size} flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary`}
        >
          {name[0] ?? "؟"}
        </div>
      }
    />
  );
}

/**
 * انتخابِ طرف حساب (تامین‌کننده در خرید، مشتری در فروش) — هم‌شکلِ انتخابِ
 * کالا: جست‌وجو بالا و نتیجه‌ها زیرش، بدونِ پنجره‌ی شناور تا روی موبایل با
 * باز شدنِ صفحه‌کلید گم نشود.
 *
 * جست‌وجو سمتِ سرور است (صفحه‌ی کامل از هزاران طرف حساب لود نمی‌شود)؛ این
 * کامپوننت فقط نمایش است و بخشِ هر صفحه (`PurchaseSupplierSection`،
 * `SaleCustomerSection`) query را می‌سازد.
 *
 * کیبورد: ↑/↓ بینِ نتیجه‌ها، Enter انتخاب، Esc پاک‌کردن/انصرافِ تغییر.
 *
 * @param results    نتیجه‌های همین جست‌وجو
 * @param total      کلِ نتیجه‌ها روی سرور (برای «۲۰ از ۱۳۵»)
 * @param selected   طرف حسابِ انتخاب‌شده (جزئیات یا ردیفِ نتیجه)، یا `null`
 * @param onSelect   `(party) => void`
 */
export default function PartyPickerCard({
  step,
  title,
  addNewLabel,
  onAddNew,
  error,
  search,
  onSearchChange,
  results = [],
  total = 0,
  isSearching = false,
  selected,
  onSelect,
  onClear,
  searchPlaceholder = "جست‌وجوی نام یا شرکت...",
  emptyListText,
  notFoundText,
}) {
  const [changing, setChanging] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listId = useId();

  const words = search.trim().split(/\s+/).filter(Boolean);
  const showSearch = !selected || changing;
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  const choose = (party) => {
    onSelect(party);
    onSearchChange("");
    setChanging(false);
    setActive(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = (activeIndex + step + results.length) % results.length;
      setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      // Enter نباید فرمِ کل صفحه را بفرستد.
      e.preventDefault();
      if (results[activeIndex]) choose(results[activeIndex]);
    } else if (e.key === "Escape") {
      if (search) onSearchChange("");
      else if (changing) setChanging(false);
    }
  };

  return (
    <SectionCard
      step={step}
      title={title}
      className="@container/party"
      action={
        onAddNew && (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onAddNew}>
            <UserPlus className="size-3.5" />
            {addNewLabel}
          </Button>
        )
      }
    >
      <div className="space-y-3">
        {selected && (
          <div
            className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 ${
              changing ? "border-dashed border-border opacity-60" : "border-primary/30 bg-primary/5"
            }`}
          >
            <PartyAvatar party={selected} size="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-card-foreground">
                {partyDisplayName(selected)}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {selected.id && <span className="font-mono">#{formatNumber(selected.id)}</span>}
                {contactNameOf(selected) && <span>{contactNameOf(selected)}</span>}
                {(selected.phone || selected.phoneNumber) && (
                  <span className="inline-flex items-center gap-1" dir="ltr">
                    <Phone className="h-3 w-3" />
                    {selected.phone || selected.phoneNumber}
                  </span>
                )}
                {selected.city && <span>{selected.city}</span>}
              </p>
            </div>
            <div className="flex w-full items-center justify-between gap-2 @md/party:w-auto">
              {/* تا جزئیات نرسیده مانده معلوم نیست؛ «تسویه»ی ساختگی نشان نده. */}
              {selected.ledgerBalance != null || selected.balanceType != null ? (
                <LedgerBalanceBadge balance={partyBalanceOf(selected)} className="text-xs" />
              ) : (
                <span />
              )}
              <div className="flex items-center gap-1">
                {!changing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      setChanging(true);
                      requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    تغییر
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setChanging(false);
                    onSearchChange("");
                    onClear();
                  }}
                  aria-label="حذف انتخاب"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {showSearch && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={results.length ? `${listId}-${activeIndex}` : undefined}
                aria-invalid={!!error && !selected}
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setActive(0);
                }}
                onKeyDown={handleKeyDown}
                className="input-rtl-placeholder h-10 pr-9 pl-9"
              />
              <span className="absolute left-2 top-1/2 flex -translate-y-1/2 items-center">
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  search && (
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={() => onSearchChange("")}
                      aria-label="پاک‌کردنِ جست‌وجو"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )
                )}
              </span>
            </div>

            {results.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <ul
                  id={listId}
                  role="listbox"
                  className="custom-scroll max-h-72 divide-y divide-border overflow-y-auto bg-card"
                >
                  {results.map((party, index) => {
                    const contact = contactNameOf(party);
                    return (
                      <li
                        key={party.id}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => choose(party)}
                        className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
                          index === activeIndex ? "bg-accent" : ""
                        }`}
                      >
                        <PartyAvatar party={party} size="h-8 w-8" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-card-foreground">
                            <Highlight text={partyDisplayName(party)} words={words} />
                          </p>
                          <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                            <span className="font-mono">#{formatNumber(party.id)}</span>
                            {contact && (
                              <span className="truncate">
                                <Highlight text={contact} words={words} />
                              </span>
                            )}
                          </p>
                        </div>
                        <LedgerBalanceBadge
                          balance={partyBalanceOf(party)}
                          className="hidden shrink-0 text-[11px] @md/party:inline-flex"
                        />
                      </li>
                    );
                  })}
                </ul>
                {total > results.length && (
                  <p className="border-t border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                    {formatNumber(results.length)} از {formatNumber(total)} نتیجه — برای یافتنِ بقیه
                    دقیق‌تر جست‌وجو کنید.
                  </p>
                )}
              </div>
            ) : (
              !isSearching && (
                <div className="space-y-2 rounded-lg border border-dashed border-border py-5 text-center">
                  <p className="text-xs text-muted-foreground">
                    {search ? notFoundText : emptyListText}
                  </p>
                  {search && onAddNew && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={onAddNew}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {addNewLabel}
                    </Button>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {error && !selected && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </SectionCard>
  );
}
