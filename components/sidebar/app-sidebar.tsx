"use client";

import * as React from "react";
import {
  Layout,
  Image,
  FileText,
  LifeBuoy,
  Send,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { NavMain, type NavMainItem } from "@/components/sidebar/nav-main";
import { NavSecondary } from "@/components/sidebar/nav-secondary";
import { NavBlocks } from "@/components/sidebar/nav-blocks";
import { NavUser } from "@/components/sidebar/nav-user";
import { useRecentBoards } from "@/app/lib/hooks/use-boards";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import ThemeSwitcher from "@/components/theme-switcher-03";

const navSecondary: Array<{
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
}> = [
  {
    id: "support",
    title: "Support",
    url: "#",
    icon: LifeBuoy,
  },
  {
    id: "feedback",
    title: "Feedback",
    url: "#",
    icon: Send,
  },
  {
    id: "theme",
    title: "Theme",
    url: "#",
    icon: Sparkles,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: recentBoards } = useRecentBoards();

  const navMain: NavMainItem[] = [
    {
      id: "boards",
      title: "Boards",
      url: "#",
      icon: Layout,
      isActive: true,
      items: [
        {
          id: "boards-all",
          title: "Alle Boards",
          url: "#",
        },
        {
          id: "boards-favorites",
          title: "Favoriten",
          url: "#",
        },
        {
          id: "boards-recent",
          title: "Zuletzt verwendet",
          url: "#",
        },
        {
          id: "boards-separator",
          type: "separator",
        },
        ...(recentBoards?.map((board) => ({
          id: board.id,
          title: board.title,
          url: `/builder/${board.slug}`,
        })) || []),
      ],
    },
    {
      id: "media",
      title: "Media",
      url: "#",
      icon: Image,
      items: [
        {
          id: "media-images",
          title: "Bilder",
          url: "#",
        },
        {
          id: "media-videos",
          title: "Videos",
          url: "#",
        },
        {
          id: "media-uploads",
          title: "Uploads",
          url: "#",
        },
      ],
    },
    {
      id: "templates",
      title: "Templates",
      url: "#",
      icon: FileText,
      items: [
        {
          id: "templates-browse",
          title: "Vorlagen durchsuchen",
          url: "#",
        },
        {
          id: "templates-my",
          title: "Meine Vorlagen",
          url: "#",
        },
      ],
    },
  ];

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Sparkles className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">LemonSpace</span>
                  <span className="truncate text-xs">Builder</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavBlocks />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
