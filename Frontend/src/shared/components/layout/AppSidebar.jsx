import { useMemo } from "react";

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
} from "@/shared/components/ui/sidebar";

import { navigationData } from "@/shared/constants/navigationData";
import {
  satisfies,
  usePermission,
} from "@/features/auth/hooks/usePermission";

const data = navigationData;

function filterNav(items, names) {
  return items.flatMap((item) => {
    if (!satisfies(names, item.permission)) return [];
    if (!item.items?.length) return [item];

    const children = item.items.filter((sub) =>
      satisfies(names, sub.permission),
    );
    return children.length ? [{ ...item, items: children }] : [];
  });
}

export function AppSidebar({ ...props }) {
  const { names, isPending } = usePermission();

  const navMain = useMemo(
    () => (isPending ? [] : filterNav(data.navMain, names)),
    [names, isPending],
  );

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
