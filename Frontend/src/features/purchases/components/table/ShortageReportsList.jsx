// src/features/purchases/components/table/ShortageReportsList.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, PackageX, ChevronLeft, AlertCircle } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  PURCHASE_ISSUE_TYPE_LABELS,
  PURCHASE_ISSUE_TYPE_STYLES,
} from "@/shared/constants/purchaseIssueTypes";
import { useShortageReportsQuery } from "../../services/returns/queries";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

function IssueTypeBadges({ items }) {
  const distinctTypes = useMemo(
    () => [...new Set(items.map((i) => i.issueType))],
    [items],
  );
  return (
    <div className="flex flex-wrap gap-1">
      {distinctTypes.map((type) => (
        <Badge
          key={type}
          variant="outline"
          className={`text-[10px] ${
            PURCHASE_ISSUE_TYPE_STYLES[type] ?? PURCHASE_ISSUE_TYPE_STYLES.other
          }`}
        >
          {PURCHASE_ISSUE_TYPE_LABELS[type] ?? type}
        </Badge>
      ))}
    </div>
  );
}

export default function ShortageReportsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: reports = [], isLoading, isError, error, refetch } =
    useShortageReportsQuery();

  const filtered = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) =>
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q),
    );
  }, [reports, search]);

  const handleOpen = (purchaseId) => {
    navigate(`/purchases/returns/new/${purchaseId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{error?.message ?? "خطایی رخ داده است"}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="جست‌وجو با شماره فاکتور یا نام تامین‌کننده..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center border border-dashed border-border rounded-lg">
          <PackageX className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {search ? "گزارشی با این مشخصات یافت نشد" : "در حال حاضر هیچ گزارش کسری بازی وجود ندارد"}
          </p>
        </div>
      ) : (
        <>
          {/* نسخه دسکتاپ: جدول */}
          <div className="hidden md:block border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs">
                <tr>
                  <th className="text-right px-3 py-2.5 font-medium">فاکتور خرید</th>
                  <th className="text-right px-2 py-2.5 font-medium">تامین‌کننده</th>
                  <th className="text-center px-2 py-2.5 font-medium">آخرین گزارش</th>
                  <th className="text-center px-2 py-2.5 font-medium">تعداد اقلام</th>
                  <th className="text-center px-2 py-2.5 font-medium">جمع کسری</th>
                  <th className="text-right px-2 py-2.5 font-medium">نوع مشکلات</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((report) => (
                  <tr
                    key={report.purchaseId}
                    className="hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => handleOpen(report.purchaseId)}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {report.invoiceNumber}
                    </td>
                    <td className="px-2 py-2.5 text-sm">{report.supplierName}</td>
                    <td className="px-2 py-2.5 text-center text-xs tabular-nums">
                      {report.lastReportDate ? gregorianToPersian(report.lastReportDate) : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums">
                      {report.items.length.toLocaleString("fa-IR")}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                        {report.totalOpenShortageQty.toLocaleString("fa-IR")} عدد
                      </Badge>
                    </td>
                    <td className="px-2 py-2.5">
                      <IssueTypeBadges items={report.items} />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* نسخه موبایل: کارت */}
          <div className="md:hidden space-y-2">
            {filtered.map((report) => (
              <button
                key={report.purchaseId}
                type="button"
                onClick={() => handleOpen(report.purchaseId)}
                className="w-full text-right border border-border rounded-lg p-3 space-y-2 bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-card-foreground text-sm truncate">
                      {report.invoiceNumber}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{report.supplierName}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 shrink-0">
                    {report.totalOpenShortageQty.toLocaleString("fa-IR")} عدد
                  </Badge>
                </div>
                <IssueTypeBadges items={report.items} />
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                  <span>{report.items.length.toLocaleString("fa-IR")} قلم کسری</span>
                  <span>
                    {report.lastReportDate ? gregorianToPersian(report.lastReportDate) : "—"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}