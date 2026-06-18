import { TooltipProvider } from "@/shared/components/ui/tooltip";

import { AppSidebar } from "@/shared/components/sidebar/app-sidebar";
import {
} from "@/shared/components/breadcrumb/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/components/ui/sidebar";
import { ModeToggle } from "@/shared/components/theme/mode-toggle";

import { AppBreadcrumb } from "@/shared/components/breadcrumb/AppBreadcrumb";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar side="right" />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <div className=" ml-auto flex items-center gap-2 ">
              <SidebarTrigger className="-mr-1 ml-auto " />
              <ModeToggle />
            </div>
            {/* <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Build Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb> */}
            <AppBreadcrumb />
          </header>
          <div className="flex p-4">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
