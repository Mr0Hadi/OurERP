import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

/**
 * پوسته‌ی صفحه‌های لیست: کارت با عنوان، دکمه‌ی «ایجاد» و محتوا (فیلترها + جدول).
 *
 * @param {object} props
 * @param {string} props.title
 * @param {React.ComponentType} [props.icon] آیکنِ کنارِ عنوان
 * @param {React.ReactNode} [props.description] یک خط توضیح زیرِ عنوان
 * @param {{ label: string, to: string }} [props.create] دکمه‌ی ایجادِ رکوردِ جدید
 * @param {React.ReactNode} [props.actions] دکمه‌های اضافه‌ی سرتیتر
 *
 * در موبایل قابِ کارت برداشته می‌شود: کارتِ فیلتر و کارت‌های ردیف داخلِ یک کارتِ دیگر
 * فقط حاشیه‌ی دوبل و عرضِ هدررفته بود.
 */
export default function ListPageLayout({ title, icon: Icon, description, create, actions, children }) {
  return (
    <div className="container mx-auto min-w-0 space-y-6">
      <Card className="max-md:gap-4 max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:py-0 max-md:shadow-none max-md:ring-0">
        {/* موبایل: عنوان و دکمه‌ی ایجاد در یک ردیف، توضیح زیرِ هر دو در تمامِ عرض.
            آیکنِ صفحه در موبایل نمی‌آید — مربعِ رنگیِ کنارِ عنوان با دکمه‌ی «بازگشت» اشتباه گرفته می‌شد. */}
        <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 max-md:px-0">
          <div className="flex min-w-0 items-center gap-2 self-center">
            {Icon && <Icon className="hidden size-5 shrink-0 text-primary md:block" />}
            <CardTitle className="truncate text-lg font-bold md:text-lg">{title}</CardTitle>
          </div>
          {(create || actions) && (
            <div className="flex items-center gap-2">
              {actions}
              {create && (
                <Button asChild className="h-9 gap-1.5 rounded-full px-3.5 shadow-sm md:rounded-lg md:px-4">
                  <Link to={create.to} aria-label={create.label}>
                    <Plus className="size-4" />
                    <span className="max-md:hidden">{create.label}</span>
                    <span className="md:hidden">جدید</span>
                  </Link>
                </Button>
              )}
            </div>
          )}
          {description && (
            <p className="col-span-full text-xs leading-5 text-muted-foreground md:max-w-3xl">{description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3 max-md:px-0">{children}</CardContent>
      </Card>
    </div>
  );
}
