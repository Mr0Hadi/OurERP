import { ArrowDown, ArrowUp, Lock, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/lib/utils";
import { WIDGETS_BY_ID } from "../domain/widgetRegistry";

/**
 * پنلِ «داشبوردِ من» — روشن/خاموش و ترتیبِ ویجت‌ها.
 *
 * فقط ویجت‌هایی فهرست می‌شوند که برای این کاربر *در دسترس‌اند*؛ گزینه‌ای
 * که روشن‌کردنش فقط یک ۴۰۳ نشان می‌دهد، گزینه نیست.
 *
 * جابه‌جایی با دو دکمه‌ی بالا/پایین است نه کشیدن: روی موبایل و با
 * صفحه‌کلید هم کار می‌کند و برای فهرستی ده‌تایی کافی است.
 */
export default function DashboardCustomizeSheet({
  open,
  onOpenChange,
  layout,
}) {
  const { order, hidden, toggle, move, reset, isCustomized } = layout;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>شخصی‌سازی داشبورد</SheetTitle>
          <SheetDescription>
            فقط بخش‌هایی را می‌بینید که نقش و دسترسی‌تان اجازه می‌دهد. تغییرها
            همین حالا ذخیره می‌شوند و فقط برای خودتان است.
          </SheetDescription>
        </SheetHeader>

        <ol className="flex-1 space-y-1.5 overflow-y-auto p-4">
          {order.map((id, index) => {
            const widget = WIDGETS_BY_ID[id];
            const visible = !hidden.has(id);
            const switchId = `widget-toggle-${id}`;
            // قفل‌ها (سرِ صفحه) ثابت‌اند؛ نه خودشان جابه‌جا می‌شوند و نه
            // چیزی از رویشان رد می‌شود.
            const canMoveUp =
              !widget.locked && index > 0 && !WIDGETS_BY_ID[order[index - 1]].locked;
            const canMoveDown =
              !widget.locked &&
              index < order.length - 1 &&
              !WIDGETS_BY_ID[order[index + 1]].locked;

            return (
              <li
                key={id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border p-2.5",
                  !visible && "bg-muted/40",
                )}
              >
                <div className="flex flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    disabled={!canMoveUp}
                    onClick={() => move(id, -1)}
                    aria-label={`بردنِ «${widget.title}» به بالا`}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    disabled={!canMoveDown}
                    onClick={() => move(id, 1)}
                    aria-label={`بردنِ «${widget.title}» به پایین`}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>

                <label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <span className={cn("truncate", !visible && "text-muted-foreground")}>
                      {widget.title}
                    </span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                      {widget.group}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {widget.description}
                  </span>
                </label>

                {widget.locked ? (
                  <Lock
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-label="همیشه نمایش داده می‌شود"
                  />
                ) : (
                  <Switch
                    id={switchId}
                    checked={visible}
                    onCheckedChange={(checked) => toggle(id, checked)}
                  />
                )}
              </li>
            );
          })}
        </ol>

        <SheetFooter className="border-t">
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            disabled={!isCustomized}
            className="gap-2"
          >
            <RotateCcw className="size-4" />
            بازگشت به چیدمانِ پیش‌فرضِ نقشِ من
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
