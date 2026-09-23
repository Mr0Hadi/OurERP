import { useMemo, useState } from "react";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, Search, X } from "lucide-react";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

const toFa = (n) => n.toLocaleString("fa-IR");

/** حرفِ «ی/ک» عربی و فاصله‌ی مجازی نباید جست‌وجو را خراب کنند. */
const normalize = (text) =>
  String(text ?? "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ")
    .toLowerCase()
    .trim();

/**
 * ویرایشگرِ فشرده‌ی دسترسی‌ها.
 *
 * هر گروه یک ردیفِ تک‌خطی است (تیکِ گروه، عنوان، شمارنده و نوارِ پیشرفت) که
 * با کلیک باز می‌شود؛ تا وقتی جست‌وجو یا فیلتری فعال است همه‌ی گروه‌های
 * مرتبط خودشان باز می‌شوند و گروه‌های بی‌ربط پنهان.
 *
 * کنترل‌شده است: `selected` مجموعه‌ی *اعدادِ* دسترسی است و هر تغییر یک
 * مجموعه‌ی تازه به `onChange` می‌دهد.
 *
 * @param groups     `permissionGroups` سرور — هرگز هاردکد نشود
 * @param baseline   نسخه‌ی ذخیره‌شده؛ تغییرات نسبت به آن علامت می‌خورند
 * @param suggested  الگوی واحد (اختیاری)؛ مواردش برچسبِ «الگو» می‌گیرند و
 *                   فیلترِ «تفاوت با الگو» فعال می‌شود
 * @param locked     مواردی که نباید برداشته شوند
 * @param footer     نوارِ پایینیِ چسبان (دکمه‌ی ذخیره و ...)
 */
export default function PermissionEditor({
  groups,
  selected,
  onChange,
  baseline = null,
  suggested = null,
  locked = new Set(),
  lockedHint,
  disabled = false,
  footer = null,
  className,
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState("all");
  const [open, setOpen] = useState(() => new Set());

  const hasTemplate = suggested != null && suggested.size > 0;
  const activeView = view === "diff" && !hasTemplate ? "all" : view;

  const isDiff = (permission) =>
    hasTemplate && suggested.has(permission) !== selected.has(permission);

  const selectedCount = selected.size;
  const diffCount = useMemo(() => {
    if (!hasTemplate) return 0;
    let n = 0;
    for (const p of suggested) if (!selected.has(p)) n++;
    for (const p of selected) if (!suggested.has(p) && !locked.has(p)) n++;
    return n;
  }, [hasTemplate, suggested, selected, locked]);

  const needle = normalize(query);
  const filtering = needle !== "" || activeView !== "all";

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => {
          const titleMatches = needle && normalize(group.groupTitle).includes(needle);
          const items = group.permissions.filter((item) => {
            if (activeView === "selected" && !selected.has(item.permission)) return false;
            if (activeView === "diff" && !isDiff(item.permission)) return false;
            if (!needle || titleMatches) return true;
            return (
              normalize(item.title).includes(needle) ||
              normalize(item.name).includes(needle)
            );
          });
          return { ...group, items };
        })
        .filter((group) => !filtering || group.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, needle, activeView, selected, suggested],
  );

  const allOpen = groups.every((g) => open.has(g.group));

  const toggleOpen = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setMany = (permissions, checked) => {
    const next = new Set(selected);
    for (const permission of permissions) {
      if (locked.has(permission)) continue;
      if (checked) next.add(permission);
      else next.delete(permission);
    }
    onChange(next);
  };

  const views = [
    { id: "all", label: "همه" },
    { id: "selected", label: `داده‌شده (${toFa(selectedCount)})` },
    ...(hasTemplate
      ? [{ id: "diff", label: `تفاوت با الگو (${toFa(diffCount)})` }]
      : []),
  ];

  return (
    <div className={cn("flex min-h-0 flex-col rounded-xl border border-border bg-card", className)}>
      {/* نوار ابزار */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جست‌وجوی دسترسی..."
            className="h-8 pr-8 pl-7"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="پاک کردن جست‌وجو"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex rounded-lg bg-muted p-0.5 text-xs">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors",
                activeView === v.id
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {!filtering && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground"
            onClick={() =>
              setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.group)))
            }
          >
            {allOpen ? (
              <ChevronsDownUp className="size-3.5" />
            ) : (
              <ChevronsUpDown className="size-3.5" />
            )}
            {allOpen ? "بستن همه" : "باز کردن همه"}
          </Button>
        )}
      </div>

      {/* گروه‌ها */}
      <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {visibleGroups.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {activeView === "diff"
              ? "هیچ تفاوتی با الگو نیست."
              : activeView === "selected" && !needle
                ? "هنوز دسترسی‌ای داده نشده است."
                : "دسترسی‌ای با این عبارت پیدا نشد."}
          </p>
        )}

        {visibleGroups.map((group) => {
          const total = group.permissions.length;
          const count = group.permissions.filter((p) => selected.has(p.permission)).length;
          const state = count === 0 ? false : count === total ? true : "indeterminate";
          const expanded = filtering || open.has(group.group);
          const groupDiff = group.permissions.some((p) => isDiff(p.permission));

          return (
            <section key={group.group}>
              <div
                className="flex h-10 cursor-pointer items-center gap-2.5 px-3 hover:bg-muted/40"
                onClick={() => !filtering && toggleOpen(group.group)}
              >
                <Checkbox
                  checked={state}
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={(checked) =>
                    setMany(
                      group.permissions.map((p) => p.permission),
                      checked === true,
                    )
                  }
                  aria-label={`انتخاب همه‌ی ${group.groupTitle}`}
                />
                <span className="flex-1 truncate text-sm font-medium">
                  {group.groupTitle}
                </span>
                {groupDiff && (
                  <span
                    className="size-1.5 rounded-full bg-amber-500"
                    title="با الگو تفاوت دارد"
                  />
                )}
                <div className="hidden h-1 w-16 overflow-hidden rounded-full bg-muted sm:block">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-left text-xs text-muted-foreground tabular-nums">
                  {toFa(count)}/{toFa(total)}
                </span>
                {!filtering && (
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                )}
              </div>

              {expanded && (
                <ul className="grid grid-cols-1 gap-x-4 px-3 pb-2 sm:grid-cols-2 2xl:grid-cols-3">
                  {group.items.map((item) => (
                    <PermissionRow
                      key={item.permission}
                      item={item}
                      checked={selected.has(item.permission)}
                      saved={baseline?.has(item.permission)}
                      trackChanges={baseline != null}
                      inTemplate={hasTemplate && suggested.has(item.permission)}
                      locked={locked.has(item.permission)}
                      lockedHint={lockedHint}
                      disabled={disabled}
                      onToggle={(checked) => setMany([item.permission], checked)}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {footer && (
        <div className="sticky bottom-0 border-t border-border bg-card/95 p-2 backdrop-blur">
          {footer}
        </div>
      )}
    </div>
  );
}

function PermissionRow({
  item,
  checked,
  saved,
  trackChanges,
  inTemplate,
  locked,
  lockedHint,
  disabled,
  onToggle,
}) {
  const id = `perm-${item.permission}`;
  const added = trackChanges && checked && !saved;
  const removed = trackChanges && !checked && saved;

  return (
    <li
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-1.5",
        inTemplate && !checked && "bg-amber-500/10",
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled || locked}
        onCheckedChange={(value) => onToggle(value === true)}
      />
      <label
        htmlFor={id}
        title={locked ? lockedHint : item.name}
        className={cn(
          "flex-1 truncate text-sm",
          disabled || locked ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer",
          removed && "text-muted-foreground line-through",
          added && "font-medium text-emerald-600 dark:text-emerald-400",
        )}
      >
        {item.title}
      </label>
      {inTemplate && (
        <span className="shrink-0 rounded px-1 text-[10px] leading-4 text-primary ring-1 ring-primary/30">
          الگو
        </span>
      )}
    </li>
  );
}
