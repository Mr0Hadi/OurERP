import { HelpCircle, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";

/**
 * کالاهایی که طرف حساب فرستاده ولی نه در این سند‌اند و نه اصلاً
 * در فهرست کالاهای ما تعریف شده‌اند.
 *
 * اینجا عمداً هیچ انتخابگر کالا و هیچ «ثبت کالای جدید»ی نیست: انباردار
 * پای بارانداز نه قیمت خرید می‌داند نه دسته‌بندی، و اگر قرار باشد کالا
 * همان روز عودت داده شود، ساختن یک رکورد کالا فقط فهرست کالاها را
 * آلوده می‌کند. اتصال به کالای واقعی دقیقاً وقتی خواسته می‌شود که
 * واحد خرید تصمیم بگیرد کالا را نگه دارد — آن‌جا هم اطلاعات لازم هست
 * و هم کسی که باید تصمیم بگیرد.
 */
export default function UnknownItemsSection({
  partyLabel = "تامین‌کننده",
  items,
  incompleteCount,
  showErrors,
  onAdd,
  onUpdate,
  onRemove,
}) {
  const totalQuantity = items.reduce(
    (sum, row) =>
      sum + (row.productName?.trim() ? Number(row.quantity) || 0 : 0),
    0,
  );

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          کالای ثبت‌نشده
        </CardTitle>
        {totalQuantity > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {totalQuantity.toLocaleString("fa-IR")} عدد
          </span>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">
            اگر {partyLabel} کالایی فرستاده که در این سند نیست و در سیستم هم
            تعریف نشده، همین‌جا فقط شرح و تعدادش را بنویسید. لازم نیست کالا را
            اول در فهرست کالاها ثبت کنید.
          </p>
        )}

        {items.map((row) => (
          <div
            key={row.id}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-card rounded-md border border-border p-1.5"
          >
            <Input
              placeholder="شرح کالا (مثلاً: کارتن فیلتر بدون برچسب)..."
              value={row.productName}
              onChange={(e) => onUpdate(row.id, "productName", e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Input
              type="number"
              min={0}
              value={row.quantity}
              onChange={(e) => onUpdate(row.id, "quantity", e.target.value)}
              className="h-8 text-center text-xs sm:w-16 shrink-0"
            />
            <Input
              placeholder="واحد"
              value={row.unit}
              onChange={(e) => onUpdate(row.id, "unit", e.target.value)}
              className="h-8 text-center text-xs sm:w-20 shrink-0"
            />
            <Input
              placeholder="یادداشت (اختیاری)..."
              value={row.note || ""}
              onChange={(e) => onUpdate(row.id, "note", e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(row.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs gap-1.5"
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          افزودن کالای ثبت‌نشده
        </Button>

        {incompleteCount > 0 && (
          <p
            className={`text-xs ${showErrors ? "text-destructive" : "text-muted-foreground"}`}
          >
            {incompleteCount.toLocaleString("fa-IR")} ردیف شرح یا تعداد ندارد و
            ثبت نمی‌شود. یا کاملش کنید یا حذفش کنید.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
