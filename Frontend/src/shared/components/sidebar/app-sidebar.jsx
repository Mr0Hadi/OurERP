import { NavMain } from "@/shared/components/sidebar/nav-main";
import { NavTools } from "@/shared/components/sidebar/nav-tools";
import { NavSecondary } from "@/shared/components/sidebar/nav-secondary";
import { NavUser } from "@/shared/components/sidebar/nav-user";
import { NavWorkspace } from "@/shared/components/sidebar/nav-workspace";
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
