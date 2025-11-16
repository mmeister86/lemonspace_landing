"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useUser } from "@/app/lib/user-context";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function getInitials(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function NavUser() {
  const router = useRouter();
  const { user } = useUser();
  const [userAvatar, setUserAvatar] = React.useState("");

  // User-Daten aus Supabase in das Format für User-Menü umwandeln
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";
  const userInitials = getInitials(userName);

  // Avatar-URL aus Supabase Storage abrufen
  React.useEffect(() => {
    async function fetchAvatarUrl() {
      if (!user) {
        setUserAvatar("");
        return;
      }

      // Prüfe ob User Metadata eine Avatar-URL enthält
      const avatarUrl = user.user_metadata?.avatar_url;

      if (!avatarUrl) {
        setUserAvatar("");
        return;
      }

      // Wenn bereits eine vollständige URL, direkt verwenden
      if (typeof avatarUrl === "string" && avatarUrl.startsWith("http")) {
        setUserAvatar(avatarUrl);
        return;
      }

      // Falls es eine Datei-ID ist, hole die URL aus Supabase Storage
      const bucketName = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || "avatars";

      try {
        const { data } = supabase.storage
          .from(bucketName)
          .getPublicUrl(avatarUrl, {
            transform: {
              width: 128,
              height: 128,
            },
          });

        if (data?.publicUrl) {
          setUserAvatar(data.publicUrl);
        } else {
          setUserAvatar("");
        }
      } catch (error) {
        // Bei Fehler (z.B. Datei nicht gefunden, keine Berechtigung) auf leeren String zurückfallen
        console.warn("Avatar konnte nicht geladen werden:", error);
        setUserAvatar("");
      }
    }

    fetchAvatarUrl();
  }, [user]);

  const handleUpgradeToPro = React.useCallback(() => {
    console.log("Upgrade to Pro");
    toast.info("Upgrade-Funktion noch nicht verfügbar");
  }, []);

  const handleUserAccount = React.useCallback(() => {
    console.log("Account");
    toast.info("Account-Funktion noch nicht verfügbar");
  }, []);

  const handleUserBilling = React.useCallback(() => {
    console.log("Billing");
    toast.info("Abrechnungs-Funktion noch nicht verfügbar");
  }, []);

  const handleUserNotifications = React.useCallback(() => {
    console.log("Notifications");
    toast.info("Benachrichtigungs-Funktion noch nicht verfügbar");
  }, []);

  const handleLogout = React.useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.replace("/");
    } catch (error) {
      console.error("Logout-Fehler:", error);
      toast.error("Fehler beim Abmelden", {
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
  }, [router]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="sm"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-8"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="rounded-lg">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {userEmail}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="rounded-lg">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleUpgradeToPro}>
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Auf Pro upgraden</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleUserAccount}>
              <BadgeCheck className="mr-2 h-4 w-4" />
              <span>Konto</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleUserBilling}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Abrechnung</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleUserNotifications}>
              <Bell className="mr-2 h-4 w-4" />
              <span>Benachrichtigungen</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Abmelden</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
