import { useNavigate } from "react-router-dom";
import { BadgeCheck, ChevronsUpDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/components/ui/sidebar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ROUTES } from "@/shared/constants/routes";
import {
  useUserInfoQuery,
  useLogoutMutation,
} from "@/features/auth/services/queries";

/**
 * حرفِ اولِ نام و نام خانوادگی.
 *
 * `slice(0, 2)` قبلی روی فارسی غلط بود: دو حرفِ اولِ *یک* کلمه را
 * برمی‌داشت («ام» از «امیر») که نه سرنامِ کسی است و نه خوانا.
 */
function initialsOf(user) {
  const first = user.firstName?.trim()?.[0];
  const last = user.lastName?.trim()?.[0];
  const initials = [first, last].filter(Boolean).join("");

  return initials || user.username?.slice(0, 2) || "؟";
}

/** `UserInfoDto` نامِ کامل ندارد؛ از `firstName`/`lastName` ساخته می‌شود. */
const fullNameOf = (user) =>
  `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username;

export function NavUser() {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();

  // `isLoading` و نه `isPending` — کوئریِ غیرفعال (کاربرِ خارج‌شده) برای
  // همیشه `isPending` می‌ماند و اسکلتون هرگز تمام نمی‌شد.
  const { data: user, isLoading, isError } = useUserInfoQuery();
  const logoutMutation = useLogoutMutation();

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

  if (isError || !user) return null;

  const handleLogout = () => {
    // ناوبری در `onSettled` نیست چون همان‌جا `queryClient.clear()` صدا
    // زده می‌شود؛ رفتنِ فوری به صفحه‌ی ورود باعث می‌شود کاربر لحظه‌ای
    // صفحه‌ی خالیِ در حال پاک‌شدن را نبیند.
    logoutMutation.mutate(undefined, {
      onSettled: () => navigate(ROUTES.LOGIN, { replace: true }),
    });
  };

  const openAccount = () =>
    navigate(ROUTES.EMPLOYEES_DETAIL.replace(":id", user.id));

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {/* بکند روی `User` ستونِ تصویر ندارد؛ فقط سرنام می‌ماند. */}
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  {initialsOf(user)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-sm leading-tight">
                <span className="truncate font-medium">{fullNameOf(user)}</span>
                {/*
                  ایمیل نداریم — بکند روی `User` اصلاً ستونِ ایمیل ندارد.
                  نام کاربری جایش می‌نشیند: همان چیزی که کاربر با آن وارد
                  می‌شود، پس برای تشخیصِ «با کدام حساب واردم» دقیقاً همان
                  کاری را می‌کند که ایمیل در قالبِ اصلی می‌کرد.
                */}
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {user.username}
                </span>
              </div>
              <ChevronsUpDown className="ms-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "left"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-right text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {initialsOf(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-right text-sm leading-tight">
                  <span className="truncate font-medium">
                    {fullNameOf(user)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.personelCode
                      ? `کد پرسنلی: ${user.personelCode}`
                      : user.username}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/*
              «اعلان‌ها» حذف شد: نه endpoint ای دارد و نه صفحه‌ای — یک
              آیتمِ منو که هیچ‌جا نمی‌رود همان کنترلِ ظاهری است که قرار
              بود از سایدبار برداشته شود.
            */}
            <DropdownMenuItem onClick={openAccount}>
              <BadgeCheck />
              حساب کاربری
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              variant="destructive"
            >
              <LogOut />
              {logoutMutation.isPending ? "در حال خروج..." : "خروج از حساب"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
