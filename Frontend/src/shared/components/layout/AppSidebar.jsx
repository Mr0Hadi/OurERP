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

const data = navigationData;

export function AppSidebar({ ...props }) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <NavWorkspace />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavTools tools={data.tools} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
