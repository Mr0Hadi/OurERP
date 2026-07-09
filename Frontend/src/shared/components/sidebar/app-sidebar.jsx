import { NavMain } from "@/shared/components/sidebar/nav-main";
import { NavTools } from "@/shared/components/sidebar/nav-tools";
import { NavSecondary } from "@/shared/components/sidebar/nav-secondary";
import { NavUser } from "@/shared/components/sidebar/nav-user";
import { TeamSwitcher } from "@/shared/components/sidebar/team-switcher";
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
        <TeamSwitcher teams={data.teams} />
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
