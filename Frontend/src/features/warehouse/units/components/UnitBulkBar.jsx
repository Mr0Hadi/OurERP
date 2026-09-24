import { ChevronDown, Download, ListChecks, Printer, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import { UnitActionEnum, UNIT_ACTION_META, canApply, fa } from "../domain/unitVocabulary";

const ACTIONS = [UnitActionEnum.QUARANTINE, UnitActionEnum.RELEASE, UnitActionEnum.SCRAP];

/**
 * نوارِ کارهای دسته‌ای روی دانه‌های انتخاب‌شده — فقط وقتی چیزی انتخاب
 * شده، یا وقتی فهرست نتیجه دارد و می‌شود «همه‌ی نتایج» را یک‌جا گرفت.
 *
 * هر کار کنارِ خودش می‌گوید روی چند دانه از انتخاب مجاز است، تا انباردار
 * قبل از باز کردنِ دیالوگ بداند چه اتفاقی می‌افتد.
 */
export default function UnitBulkBar({
  selectedUnits,
  totalResults,
  isSelectingAll,
  onSelectAllResults,
  onPrint,
  onAction,
  onExport,
  onClear,
  canManage,
}) {
  const count = selectedUnits.length;
  const canSelectAll = totalResults > count;

  if (!count) {
    return totalResults > 0 ? (
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{fa(totalResults)} دانه با این فیلترها</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={onExport}>
            <Download className="h-4 w-4" />
            خروجی CSV همه
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={onSelectAllResults}
            disabled={isSelectingAll}
          >
            <ListChecks className="h-4 w-4" />
            {isSelectingAll ? "در حال خواندن..." : "انتخاب همه‌ی نتایج"}
          </Button>
        </div>
      </div>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2">
      <span className="px-2 text-sm font-medium tabular-nums">{fa(count)} دانه انتخاب شده</span>
      {canSelectAll && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-1"
          onClick={onSelectAllResults}
          disabled={isSelectingAll}
        >
          {isSelectingAll ? "در حال خواندن..." : `انتخاب همه‌ی ${fa(totalResults)} نتیجه`}
        </Button>
      )}

      <div className="ms-auto flex flex-wrap items-center gap-2">
        <Button type="button" size="lg" className="gap-2" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          چاپ {fa(count)} برچسب
        </Button>

        {canManage && (
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="lg" className="gap-1">
                کارِ انبار
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                روی دانه‌های مجازِ انتخاب
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ACTIONS.map((action) => {
                const eligible = selectedUnits.filter((unit) => canApply(unit, action)).length;
                return (
                  <DropdownMenuItem
                    key={action}
                    disabled={eligible === 0}
                    variant={action === UnitActionEnum.SCRAP ? "destructive" : "default"}
                    onSelect={() => onAction(action)}
                    className="justify-between gap-4"
                  >
                    {UNIT_ACTION_META[action].label}
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {fa(eligible)} از {fa(count)}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="gap-1"
          onClick={onExport}
          title="خروجی CSV از انتخاب"
        >
          <Download className="h-4 w-4" />
          CSV
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="gap-1"
          onClick={onClear}
          aria-label="لغو انتخاب"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
