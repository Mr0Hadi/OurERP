import {
  Building2,
  Calculator,
  Check,
  ChevronsUpDown,
  Server,
  Shield,
  ShoppingCart,
  Store,
  Warehouse,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/components/ui/sidebar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DepartmentEnum } from "@/shared/domain/enums/department";
import { orgPositionLabelOf } from "@/shared/domain/enums/orgHeadRole";
import { useActiveMembership } from "@/features/auth/services/queries";
import { useAuthStore } from "@/features/auth/store/authStore";

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

const iconOf = (membership) =>
  DEPARTMENT_ICONS[membership?.departmentId] ?? Building2;

/**
 * خطِ دومِ هر عضویت: نامِ تیم، و جایگاه اگر از «عضو» بالاتر باشد.
 *
 * اگر کاربر تیم ندارد (سرپرستِ واحد معمولاً ندارد) جایگاهِ واحد جایش
 * می‌نشیند، و اگر آن هم نبود «بدون تیم» — که یک واقعیت است، نه خطا.
 */
function subtitleOf(membership) {
  if (!membership) return null;

  const teamPosition = orgPositionLabelOf(membership.teamRole);
  if (membership.teamName) {
    return [membership.teamName, teamPosition].filter(Boolean).join(" — ");
  }

  return orgPositionLabelOf(membership.departmentRole) ?? "بدون تیم";
}

function WorkspaceIdentity({ membership }) {
  const Icon = iconOf(membership);

  return (
    <>
      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Icon className="size-4" />
      </div>
      <div className="grid flex-1 text-sm">
        <span className="truncate text-base">
          {membership?.departmentName ?? "بدون واحد"}
        </span>
        <span className="truncate text-xs text-sidebar-foreground/70">
          {subtitleOf(membership)}
        </span>
      </div>
    </>
  );
}

/**
 * جایگاهِ سازمانیِ کاربرِ واردشده در بالای سایدبار.
 *
 * گزینه‌ها **عضویت‌های خودِ کاربر**اند، نه فهرستِ همه‌ی واحدهای شرکت:
 * این یک انتخاب‌گرِ «الان با کدام جایگاهم کار می‌کنم» است، نه راهی برای
 * سرک‌کشیدن به واحدِ دیگران. انتخاب در `authStore` می‌ماند تا با رفرش
 * صفحه از بین نرود.
 *
 * وقتی کاربر فقط یک عضویت دارد (حالتِ امروزِ بکند) دراپ‌داون اصلاً ساخته
 * نمی‌شود و همان نمایشِ ساده می‌ماند — منویی که یک گزینه دارد و آن هم
 * همین است، کنترلی است که وعده‌ی بی‌اثر می‌دهد.
 */
export function NavWorkspace() {
  const { isMobile } = useSidebar();
  const setActiveMembership = useAuthStore((s) => s.setActiveMembership);

  // عمداً `isLoading` و نه `isPending`: کوئریِ نشست تا قبل از ورود
  // `enabled: false` است و یک کوئریِ غیرفعال برای همیشه `isPending`
  // می‌ماند — یعنی کاربرِ خارج‌شده یک اسکلتونِ ابدی می‌دید.
  const { memberships, activeMembership, isLoading, isError } =
    useActiveMembership();

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

  // نشست نیامد (خطای شبکه یا کاربرِ خارج‌شده): هدر خالی می‌ماند به‌جای
  // نشان‌دادنِ نامِ واحدی که مطمئن نیستیم درست است.
  if (isError || !activeMembership) return null;

  if (memberships.length < 2) {
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
              <WorkspaceIdentity membership={activeMembership} />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <WorkspaceIdentity membership={activeMembership} />
              <ChevronsUpDown className="ms-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "left"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              جایگاه‌های شما
            </DropdownMenuLabel>

            {memberships.map((membership) => {
              const Icon = iconOf(membership);
              const isActive = membership.id === activeMembership.id;

              return (
                <DropdownMenuItem
                  key={membership.id}
                  onClick={() => setActiveMembership(membership.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Icon className="size-3.5 shrink-0" />
                  </div>
                  <div className="grid flex-1 text-sm leading-tight">
                    <span className="truncate">
                      {membership.departmentName ?? "بدون واحد"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {subtitleOf(membership)}
                    </span>
                  </div>
                  {isActive && <Check className="size-4 shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
