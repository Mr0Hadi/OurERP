import {
  Building2,
  Calculator,
  Server,
  Shield,
  ShoppingCart,
  Store,
  Warehouse,
} from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DepartmentEnum } from "@/shared/domain/enums/department";
import { OrgRoleEnum } from "@/shared/domain/enums/orgRole";
import { useUserInfoQuery } from "@/features/auth/services/queries";

/**
 * آیکنِ هر واحد — تزئینی و بی‌اثر بر داده.
 *
 * کلیدها از `DepartmentEnum` می‌آیند که خودش **منبع حقیقت نیست** (واحدها
 * ردیفِ جدول‌اند و شناسه‌شان را بکند می‌دهد). پس اگر شناسه‌ای در این نگاشت
 * نبود، `Building2` می‌نشیند و هیچ‌چیز نمی‌شکند.
 */
const DEPARTMENT_ICONS = {
  [DepartmentEnum.MANAGEMENT]: Shield,
  [DepartmentEnum.SUPPLY]: ShoppingCart,
  [DepartmentEnum.SALES]: Store,
  [DepartmentEnum.WAREHOUSE]: Warehouse,
  [DepartmentEnum.ACCOUNTING]: Calculator,
  [DepartmentEnum.IT]: Server,
};

/**
 * خطِ دومِ جایگاه: نامِ تیم، و نقش اگر از «عضو» بالاتر باشد.
 *
 * مسئول/جانشینِ واحد هیچ‌وقت تیم ندارد، پس برای او خودِ نقش جای نامِ تیم
 * می‌نشیند؛ و عضوِ ساده‌ی بدونِ تیم «بدون تیم» می‌بیند — که یک واقعیت
 * است، نه خطا. «عضو» عمداً نوشته نمی‌شود: حالتِ پیش‌فرضِ همه است.
 */
function subtitleOf(user) {
  const roleTitle = user.role !== OrgRoleEnum.MEMBER ? user.roleTitle : null;

  if (user.teamName) {
    return [user.teamName, roleTitle].filter(Boolean).join(" — ");
  }

  return roleTitle ?? "بدون تیم";
}

/**
 * جایگاهِ سازمانیِ کاربرِ واردشده در بالای سایدبار.
 *
 * نمایش است، نه انتخابگر: `User` در بکند دقیقاً یک `departmentId` و
 * حداکثر یک `teamId` دارد، پس چیزی برای سوییچ‌کردن وجود ندارد.
 * `departmentName`/`teamName`/`roleTitle` را خودِ `GetUserInfo` می‌دهد.
 */
export function NavWorkspace() {
  // عمداً `isLoading` و نه `isPending`: کوئریِ کاربر تا قبل از ورود
  // `enabled: false` است و یک کوئریِ غیرفعال برای همیشه `isPending`
  // می‌ماند — یعنی کاربرِ خارج‌شده یک اسکلتونِ ابدی می‌دید.
  const { data: user, isLoading, isError } = useUserInfoQuery();

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // کاربر نیامد (خطای شبکه یا کاربرِ خارج‌شده): هدر خالی می‌ماند به‌جای
  // نشان‌دادنِ نامِ واحدی که مطمئن نیستیم درست است.
  if (isError || !user) return null;

  const Icon = DEPARTMENT_ICONS[user.departmentId] ?? Building2;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/*
          `asChild` با یک `div`: اینجا نمایش است نه کنترل. اگر
          `SidebarMenuButton` عنصرِ پیش‌فرضِ خودش (`button`) را بسازد،
          صفحه‌خوان یک دکمه‌ی قابلِ فعال‌سازی اعلام می‌کند که هیچ کاری
          نمی‌کند.
        */}
        <SidebarMenuButton size="lg" asChild className="cursor-default">
          <div>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Icon className="size-4" />
            </div>
            <div className="grid flex-1 text-sm">
              <span className="truncate text-base">
                {user.departmentName ?? "بدون واحد"}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/70">
                {subtitleOf(user)}
              </span>
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
