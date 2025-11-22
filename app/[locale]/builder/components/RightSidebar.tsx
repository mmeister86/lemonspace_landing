"use client";

import * as React from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarSeparator } from "@/components/ui/sidebar";
import { PropertiesPanel } from "./PropertiesPanel";
import { Settings2 } from "lucide-react";

export function RightSidebar() {
    return (
        <Sidebar
            side="right"
            collapsible="none"
            className="w-full border-l bg-sidebar"
        >
            <SidebarHeader className="h-14 flex flex-row items-center border-b px-4 py-0 shrink-0">
                <div className="flex items-center gap-2 font-semibold">
                    <Settings2 className="h-4 w-4" />
                    <span>Settings</span>
                </div>
            </SidebarHeader>
            <SidebarContent className="p-4">
                <PropertiesPanel />
            </SidebarContent>
        </Sidebar>
    );
}
