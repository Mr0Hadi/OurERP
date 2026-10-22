import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import { NavMain } from "@/shared/components/layout/NavMain";
import { NavTools } from "@/shared/components/layout/NavTools";
import { NavSecondary } from "@/shared/components/layout/NavSecondary";
import { NavUser } from "@/shared/components/layout/NavUser";
import { NavWorkspace } from "@/shared/components/layout/NavWorkspace";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/shared/components/ui/sidebar";

import { navigationData } from "@/shared/constants/navigationData";
import {
  satisfies,
  usePermission,
} from "@/features/auth/hooks/usePermission";
import { useFeatureFlags } from "@/features/auth/hooks/useFeatureFlags";

const data = navigationData;

/** آیتم دیده شود؟ هم دسترسی (`permission`) و هم سوییچِ قابلیت (`featureFlag`). */
function visible(item, allowed, isOn) {
  return allowed(item.permission) && isOn(item.featureFlag);
}

function filterNav(items, allowed, isOn) {
  return items.flatMap((item) => {
    if (!visible(item, allowed, isOn)) return [];
    if (!item.items?.length) return [item];

    const children = item.items.filter((sub) => visible(sub, allowed, isOn));
    return children.length ? [{ ...item, items: children }] : [];
  });
}

export function AppSidebar({ ...props }) {
  const { names, isPending, isError } = usePermission();
  const { isOn } = useFeatureFlags();
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();

  // در موبایل، با رفتن به صفحهٔ جدید دراور خودکار بسته شود.
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  // اگر فهرستِ دسترسی نیامد، منو از نظرِ دسترسی بی‌فیلتر است — مثلِ `allows` و
  // `PermissionGate` که در این حالت صفحه را باز می‌گذارند و تصمیم با ۴۰۳ِ سرور است.
  // سوییچِ قابلیت اما همیشه اعمال می‌شود: تا نیامده، آیتمِ وابسته به آن پنهان است.
  const navMain = useMemo(() => {
    if (isPending && !isError) return [];
    const allowed = isError ? () => true : (required) => satisfies(names, required);
    return filterNav(data.navMain, allowed, isOn);
  }, [names, isPending, isError, isOn]);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <NavWorkspace />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavTools tools={data.tools} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
