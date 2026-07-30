import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, X, Search } from "lucide-react";
import { Button } from "#/shared/components/ui/button";
import { Input } from "#/shared/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#/shared/components/ui/card";
import { ROUTES } from "@/shared/constants/routes";

/**
 * props:
 *  customers   - آرایه { id, companyName, firstName, lastName, image }
 *  isLoading   - وضعیت لود لیست مشتریان
 *  selectedId  - مقدار فعلی
 *  onSelect    - (id, name) => void
 *  onClear     - () => void
 *  error       - پیام خطا
 */
export default function SaleCustomerSection({
  customers = [],
  isLoading,
  selectedId,
  onSelect,
  onClear,
  error,
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleAddNew = () => {
    navigate(ROUTES.CUSTOMERS_NEW, { state: { returnTo: ROUTES.SALES_NEW } });
  };

  const selectedCustomer = customers.find((c) => c.id === selectedId);
  const displayName = selectedCustomer
    ? selectedCustomer.companyName ||
      `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
    : "";

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.companyName?.toLowerCase().includes(q) ||
        c.firstName?.toLowerCase().includes(q) ||
        c.lastName?.toLowerCase().includes(q) ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const handleSelect = (customer) => {
    const name =
      customer.companyName || `${customer.firstName} ${customer.lastName}`;
    onSelect(customer.id, name);
    setSearch("");
  };

  return (
    <Card>
      <CardHeader className="pb-1 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-card-foreground">
          مشتری
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8 px-3"
          onClick={handleAddNew}
        >
          <UserPlus className="h-4 w-4" />
          افزودن مشتری جدید
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {selectedCustomer ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
            {selectedCustomer.image ? (
              <img
                src={selectedCustomer.image}
                alt={displayName}
                className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {selectedCustomer.companyName?.[0] ??
                  selectedCustomer.firstName?.[0] ??
                  "؟"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground truncate">
                {displayName}
              </p>
              {selectedCustomer.companyName && (
                <p className="text-xs text-muted-foreground truncate">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
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
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={
                  isLoading ? "در حال بارگذاری..." : "جست‌وجوی نام یا شرکت..."
                }
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

            {filteredCustomers.length > 0 ? (
              <ul className="max-h-52 overflow-y-auto custom-scroll rounded-lg border border-border divide-y divide-border bg-card">
                {filteredCustomers.map((customer) => {
                  const name =
                    customer.companyName ||
                    `${customer.firstName} ${customer.lastName}`;
                  return (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(customer)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-right hover:bg-accent/50 transition-colors"
                      >
                        {customer.image ? (
                          <img
                            src={customer.image}
                            alt={name}
                            className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {customer.companyName?.[0] ??
                              customer.firstName?.[0] ??
                              "؟"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-sm font-medium text-card-foreground truncate">
                            {name}
                          </p>
                          {customer.companyName && (
                            <p className="text-xs text-muted-foreground truncate">
                              {customer.firstName} {customer.lastName}
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
                    {search ? "مشتری‌ای یافت نشد" : "لیست مشتریان خالی است"}
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
