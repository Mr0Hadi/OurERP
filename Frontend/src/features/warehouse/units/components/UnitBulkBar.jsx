import { useNavigate } from "react-router-dom";
import { Lock, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { fa } from "../domain/unitVocabulary";
import { unitOperationsFor } from "./unitOperations";

/**
 * نوارِ چسبانِ پایینِ صفحه وقتی دانه‌ای انتخاب شده — همان کارهای جزئیاتِ
 * دانه، برای همه‌ی انتخاب‌ها (`unitOperationsFor`).
 *
 * عددِ کنارِ هر دکمه می‌گوید روی چند دانه اعمال می‌شود، تا کاربر قبل از
 * کلیک بداند؛ بقیه در دیالوگِ همان کار با دلیل فهرست می‌شوند. کاری که الان
 * ممکن نیست غیرفعال است و دلیلش روی دکمه.
 */
export default function UnitBulkBar({
  selectedUnits,
  totalResults,
  isSelectingAll,
  onSelectAllResults,
  onPrint,
  onAction,
  onClear,
  canManage,
}) {
  const navigate = useNavigate();
  const count = selectedUnits.length;
  if (count === 0) return null;

  const operations = unitOperationsFor(selectedUnits, { canManage });
  // دکمه‌ی غیرفعال tooltip نشان نمی‌دهد؛ دلیل‌ها زیرِ نوار نوشته می‌شوند.
  const hints = [...new Set(operations.filter((op) => op.disabled && op.hint).map((op) => op.hint))];
  const run = (operation) => {
    if (operation.kind === "print") onPrint(selectedUnits);
    else if (operation.kind === "return") navigate(operation.route);
    else onAction(operation.action, selectedUnits);
  };

  return (
    <div className="pointer-events-none sticky bottom-3 z-30 flex justify-center">
      <div
        role="toolbar"
        aria-label="کارهای دانه‌های انتخاب‌شده"
        className="pointer-events-auto flex w-full max-w-4xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-popover/95 p-2 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-popover/85"
      >
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="لغو انتخاب" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold whitespace-nowrap tabular-nums">{fa(count)} دانه</span>
          {totalResults > count && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-7 px-1 text-xs"
              disabled={isSelectingAll}
              onClick={onSelectAllResults}
            >
              {isSelectingAll ? "در حال انتخاب…" : `همه‌ی ${fa(totalResults)}`}
            </Button>
          )}
        </div>

        <div className="ms-auto flex flex-wrap items-center justify-end gap-1.5">
          {operations.map((operation) => {
            const Icon = operation.icon;
            const primary = operation.kind === "print";
            return (
              <Button
                key={operation.key}
                type="button"
                size="sm"
                variant={primary ? "default" : "outline"}
                disabled={operation.disabled}
                title={operation.hint}
                className={`gap-1.5 ${
                  operation.destructive
                    ? "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    : ""
                } ${primary ? "order-last" : ""}`}
                onClick={() => run(operation)}
              >
                <Icon className="h-4 w-4" />
                {operation.label}
                {operation.count < count && (
                  <span className={`text-[11px] tabular-nums ${primary ? "opacity-80" : "text-muted-foreground"}`}>
                    ({fa(operation.count)})
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {hints.length > 0 && (
          <p className="flex basis-full items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 shrink-0" />
            {hints.join("؛ ")}
          </p>
        )}
      </div>
    </div>
  );
}
