// src/features/warehouse/receiving/components/forms/ReceivingReturnItemsSection.jsx
import { useMemo, useState } from "react";
import { Search, Minus, Plus, CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { RETURN_ISSUE_TYPE_LABELS } from "../../services/returnsIntakeApi";
import { SALES_RETURN_REASON_LABELS } from "@/features/sales/returns/services/mockData";

const ISSUE_TYPE_OPTIONS = Object.entries(RETURN_ISSUE_TYPE_LABELS);

function getRowStatus(remainingQty, verifiedQtyThisRound) {
  const qty = verifiedQtyThisRound || 0;
  if (qty <= 0) return "missing";
  if (qty < remainingQty) return "partial";
  return "complete";
}

const ROW_STATUS_CONFIG = {
  complete: { label: "این دور کامل رسید", icon: CheckCircle2, badgeClass: "bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800", rowClass: "" },
  partial: { label: "این دور ناقص رسید", icon: AlertTriangle, badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400", rowClass: "bg-amber-50/40 dark:bg-amber-950/10" },
  missing: { label: "این دور نرسید", icon: XCircle, badgeClass: "bg-destructive/5 text-destructive border-destructive/20", rowClass: "bg-destructive/[0.03]" },
};

const clampQty = (value, max) => {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return 0;
  return Math.min(num, max);
};

function QuantityStepper({ item, onItemChange, size = "sm" }) {
  const verified = item.verifiedQtyThisRound || 0;
  const dims = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const inputWidth = size === "sm" ? "w-12" : "w-14";

  const handleStep = (delta) => onItemChange(item.lineId, "verifiedQtyThisRound", clampQty(verified + delta, item.remainingQty));

  return (
    <div className="flex items-center justify-center gap-1">
      <Button type="button" size="icon" variant="outline" className={`${dims} shrink-0`} disabled={verified <= 0} onClick={() => handleStep(-1)}>
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="number" min={0} max={item.remainingQty} value={verified}
        onChange={(e) => onItemChange(item.lineId, "verifiedQtyThisRound", clampQty(e.target.value, item.remainingQty))}
        className={`${dims.split(" ")[0]} ${inputWidth} text-center text-sm px-1`}
      />
      <Button type="button" size="icon" variant="outline" className={`${dims} shrink-0`} disabled={verified >= item.remainingQty} onClick={() => handleStep(1)}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function IssueBreakdownEditor({ item, onAddIssue, onUpdateIssue, onRemoveIssue }) {
  const issues = item.issues || [];
  const verifiedQtyThisRound = item.verifiedQtyThisRound || 0;
  const allocated = issues.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const remaining = verifiedQtyThisRound - allocated;

  if (verifiedQtyThisRound <= 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/30 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-card-foreground">
          تفکیک مشکل تعدادِ رسیده در این دور ({verifiedQtyThisRound.toLocaleString("fa-IR")} عدد)
        </span>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAddIssue(item.lineId)} disabled={remaining <= 0}>
          <Plus className="h-3 w-3" />
          افزودن نوع مشکل
        </Button>
      </div>

      {issues.length === 0 && (
        <p className="text-xs text-muted-foreground">
          اگر همه‌ی این تعداد سالم است، نیازی به کاری نیست. فقط اگر بخشی مشکل دارد، با «افزودن نوع مشکل» ثبتش کنید.
        </p>
      )}

      {issues.map((issue) => (
        <div key={issue.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-card rounded-md border border-border p-1.5">
          <Select value={issue.issueType} onValueChange={(v) => onUpdateIssue(item.lineId, issue.id, "issueType", v)}>
            <SelectTrigger className="h-8 text-xs sm:w-36 shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ISSUE_TYPE_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" min={0} value={issue.qty} onChange={(e) => onUpdateIssue(item.lineId, issue.id, "qty", e.target.value)} className="h-8 text-center text-xs sm:w-16 shrink-0" />
          <Input placeholder="یادداشت (اختیاری)..." value={issue.note || ""} onChange={(e) => onUpdateIssue(item.lineId, issue.id, "note", e.target.value)} className="h-8 text-xs flex-1" />
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onRemoveIssue(item.lineId, issue.id)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function ClaimsSummary({ item }) {
  const claims = item.claims || [];
  if (claims.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
      {claims.map((c) => (
        <span key={c.id} className="text-xs text-muted-foreground">
          {SALES_RETURN_REASON_LABELS[c.reason] ?? c.reason}: {c.qty.toLocaleString("fa-IR")}
        </span>
      ))}
    </div>
  );
}

export default function ReceivingReturnItemsSection({ items, onItemChange, onAddIssue, onUpdateIssue, onRemoveIssue }) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.productName?.toLowerCase().includes(term) || item.productCode?.toLowerCase().includes(term));
  }, [items, search]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const verified = item.verifiedQtyThisRound || 0;
        const status = getRowStatus(item.remainingQty, verified);
        acc.remaining += item.remainingQty;
        acc.verifiedThisRound += verified;
        acc[status] += 1;
        return acc;
      },
      { remaining: 0, verifiedThisRound: 0, complete: 0, partial: 0, missing: 0 },
    );
  }, [items]);

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">اقلام باقی‌مانده برای دریافت</CardTitle></CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-6">همه‌ی اقلام این مرجوعی قبلاً به‌طور کامل دریافت شده‌اند.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold">اقلام باقی‌مانده برای دریافت (این دور)</CardTitle>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="outline" className={ROW_STATUS_CONFIG.complete.badgeClass}>کامل: {totals.complete.toLocaleString("fa-IR")}</Badge>
          <Badge variant="outline" className={ROW_STATUS_CONFIG.partial.badgeClass}>ناقص: {totals.partial.toLocaleString("fa-IR")}</Badge>
          <Badge variant="outline" className={ROW_STATUS_CONFIG.missing.badgeClass}>نرسیده: {totals.missing.toLocaleString("fa-IR")}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          فقط اقلامی که هنوز به‌طور کامل نرسیده‌اند اینجا نشان داده می‌شوند. مقداری که این دور دریافت شده را وارد کنید؛
          باقیمانده به‌طور خودکار برای دور بعدی نگه داشته می‌شود.
        </p>

        {items.length > 1 && (
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="جست‌وجو بر اساس نام یا کد کالا..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-8 text-sm h-9 input-rtl-placeholder" />
          </div>
        )}

        {filteredItems.map((item) => {
          const verified = item.verifiedQtyThisRound || 0;
          const status = getRowStatus(item.remainingQty, verified);
          const config = ROW_STATUS_CONFIG[status];
          const StatusIcon = config.icon;

          return (
            <div key={item.lineId} className={`rounded-lg border border-border p-3 space-y-2.5 ${config.rowClass}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-card-foreground text-sm truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.productCode}</p>
                  <ClaimsSummary item={item} />
                  {item.alreadyVerifiedQty > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      قبلاً {item.alreadyVerifiedQty.toLocaleString("fa-IR")} عدد از این کالا در دور(های) قبل دریافت شده.
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={`gap-1 text-xs shrink-0 ${config.badgeClass}`}>
                  <StatusIcon className="h-3 w-3" />{config.label}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                <span className="text-xs text-muted-foreground">
                  باقیمانده‌ی این کالا: <span className="tabular-nums font-medium text-card-foreground">{item.remainingQty.toLocaleString("fa-IR")}</span>
                </span>
                <div>
                  <p className="text-[10px] text-muted-foreground text-center mb-1">مقدار رسیده در این دور</p>
                  <QuantityStepper item={item} onItemChange={onItemChange} size="sm" />
                </div>
              </div>

              <IssueBreakdownEditor item={item} onAddIssue={onAddIssue} onUpdateIssue={onUpdateIssue} onRemoveIssue={onRemoveIssue} />
            </div>
          );
        })}

        {filteredItems.length === 0 && items.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">کالایی با این مشخصات یافت نشد</p>
        )}

        <div className="rounded-lg bg-muted px-3 py-2.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            جمع این دور: <span className="font-bold text-card-foreground tabular-nums">{totals.verifiedThisRound.toLocaleString("fa-IR")} / {totals.remaining.toLocaleString("fa-IR")}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}