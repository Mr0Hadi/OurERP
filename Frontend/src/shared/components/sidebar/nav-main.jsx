import { ChevronRight } from "lucide-react";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/shared/components/ui/sidebar";
import { Link } from "react-router-dom";

export function NavMain({ items }) {
  const [openItem, setOpenItem] = useState(
    items.find((item) => item.isActive)?.title || null
  );

  const toggleItem = (itemTitle) => {
    setOpenItem((prev) => (prev === itemTitle ? null : itemTitle));
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>امکانات</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            open={openItem === item.title}
            onOpenChange={(open) => setOpenItem(open ? item.title : null)}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild={!item.items?.length}
                tooltip={item.title}
                onClick={() => item.items?.length && toggleItem(item.title)}
              >
                {item.items?.length ? (
                  <>
                    <item.icon />
                    <span>{item.title}</span>
                  </>
                ) : (
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                )}
              </SidebarMenuButton>

              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90 transition-transform duration-200">
                      <ChevronRight />
                      <span className="sr-only">باز/بستن</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link to={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
