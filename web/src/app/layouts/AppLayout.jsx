import { TooltipProvider } from "@/shared/components/ui/tooltip";

import { AppSidebar } from "@/shared/components/sidebar/app-sidebar";
import {} from "@/shared/components/breadcrumb/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/components/ui/sidebar";
import { ModeToggle } from "@/shared/components/theme/mode-toggle";

import { AppBreadcrumb } from "@/shared/components/breadcrumb/AppBreadcrumb";
import { Outlet } from "react-router-dom";

import { useHeaderStore } from "@/shared/store/headerStore";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function AppLayout() {
  const { title, showBack, onBack } = useHeaderStore();

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar side="right" />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
            <div className=" ml-auto flex items-center gap-2 ">
              <SidebarTrigger className="-mr-1 ml-auto " />
              <ModeToggle />
              <div className="flex flex-1 items-center gap-4">
                {showBack && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onBack}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
                {title && (
                  <h1 className="hidden sm:block md:text-xl font-bold tracking-tight">{title}</h1>
                )}
              </div>
            </div>
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
