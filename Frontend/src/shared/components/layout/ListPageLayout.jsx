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
 */
export default function ListPageLayout({ title, icon: Icon, description, create, actions, children }) {
  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="size-5 text-muted-foreground" />}
            <div>
              <CardTitle>{title}</CardTitle>
              {description && (
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {(create || actions) && (
            <div className="flex items-center gap-2">
              {actions}
              {create && (
                <Button asChild className="gap-2">
                  <Link to={create.to}>
                    <Plus className="size-4" />
                    {create.label}
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">{children}</CardContent>
      </Card>
    </div>
  );
}
