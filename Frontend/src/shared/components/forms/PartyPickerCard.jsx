import { useMemo, useState } from "react";
import { UserPlus, X, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

/** نام نمایشی طرف حساب در کارت انتخاب: نام شرکت، وگرنه نام و نام خانوادگی. */
const displayNameOf = (party) =>
  party.companyName || `${party.firstName} ${party.lastName}`;

/**
 * کارت انتخاب طرف حساب (تامین‌کننده در خرید، مشتری در فروش).
 *
 * parties           - لیست { id, companyName, firstName, lastName, image }
 * isLoading         - در حال دریافت لیست
 * selectedId        - شناسه‌ی انتخاب‌شده
 * onSelect          - (id, name) => void
 * onClear           - () => void
 * error             - پیام خطای اعتبارسنجی
 * title, addNewLabel, onAddNew
 * searchPlaceholder, emptyListText, notFoundText
 */
export default function PartyPickerCard({
  parties = [],
  isLoading,
  selectedId,
  onSelect,
  onClear,
  error,
  title,
  addNewLabel,
  onAddNew,
  searchPlaceholder = "جست‌وجوی نام یا شرکت...",
  emptyListText,
  notFoundText,
}) {
  const [search, setSearch] = useState("");

  const selectedParty = parties.find((p) => p.id === selectedId);
  const displayName = selectedParty ? displayNameOf(selectedParty) : "";

  const filteredParties = useMemo(() => {
    if (!search.trim()) return parties;
    const q = search.toLowerCase();
    return parties.filter(
      (p) =>
        p.companyName?.toLowerCase().includes(q) ||
        p.firstName?.toLowerCase().includes(q) ||
        p.lastName?.toLowerCase().includes(q) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q),
    );
  }, [parties, search]);

  const handleSelect = (party) => {
    onSelect(party.id, displayNameOf(party));
    setSearch("");
  };

  return (
    <Card>
      <CardHeader className="pb-1 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-card-foreground">
          {title}
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8 px-3"
          onClick={onAddNew}
        >
          <UserPlus className="h-4 w-4" />
          {addNewLabel}
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {selectedParty ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
            {selectedParty.image ? (
              <img
                src={selectedParty.image}
                alt={displayName}
                className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {selectedParty.companyName?.[0] ??
                  selectedParty.firstName?.[0] ??
                  "؟"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground truncate">
                {displayName}
              </p>
              {selectedParty.companyName && (
                <p className="text-xs text-muted-foreground truncate">
                  {selectedParty.firstName} {selectedParty.lastName}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => {
                onClear();
                setSearch("");
              }}
              aria-label="حذف انتخاب"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          /* باکس جست‌وجو — فقط وقتی چیزی انتخاب نشده */
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={isLoading ? "در حال بارگذاری..." : searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={isLoading}
                className={`input-rtl-placeholder pr-9 h-9 ${
                  error
                    ? "border-destructive focus-visible:ring-destructive/30"
                    : ""
                }`}
              />
            </div>

            {filteredParties.length > 0 ? (
              <ul className="max-h-52 overflow-y-auto custom-scroll rounded-lg border border-border divide-y divide-border bg-card">
                {filteredParties.map((party) => {
                  const name = displayNameOf(party);
                  return (
                    <li key={party.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(party)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-right hover:bg-accent/50 transition-colors"
                      >
                        {party.image ? (
                          <img
                            src={party.image}
                            alt={name}
                            className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {party.companyName?.[0] ??
                              party.firstName?.[0] ??
                              "؟"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-sm font-medium text-card-foreground truncate">
                            {name}
                          </p>
                          {party.companyName && (
                            <p className="text-xs text-muted-foreground truncate">
                              {party.firstName} {party.lastName}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              !isLoading && (
                <div className="rounded-lg border border-dashed border-border py-6">
                  <p className="text-xs text-muted-foreground text-center">
                    {search ? notFoundText : emptyListText}
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {error && !selectedId && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
