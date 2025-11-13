"use client";

import * as React from "react";
import {
  File,
  FolderOpen,
  Save,
  Copy,
  FileText,
  Download,
  Undo2,
  Redo2,
  Scissors,
  Clipboard,
  ClipboardPaste,
  Trash2,
  MousePointerClick,
  Eye,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Settings,
  Edit,
  Link2,
  Lock,
  QrCode,
  Mail,
  Shield,
  Sparkles,
  FileDown,
  BadgeCheck,
  CreditCard,
  Bell,
  LogOut,
} from "lucide-react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarLabel,
} from "@/components/ui/menubar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/app/lib/user-context";
import { storage } from "@/lib/appwrite";
import { Models } from "appwrite";
import { BoardTitleDialog } from "./BoardTitleDialog";
import { BoardSlugDialog } from "./BoardSlugDialog";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useCreateBoard } from "@/app/lib/hooks/use-boards";
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

interface BuilderMenubarProps {
  zoomLevel: number;
  onZoomChange: (level: number) => void;
}

export function BuilderMenubar({
  zoomLevel,
  onZoomChange,
}: BuilderMenubarProps) {
  const { user } = useUser();
  const currentBoard = useCanvasStore((state) => state.currentBoard);
  const setCurrentBoard = useCanvasStore((state) => state.setCurrentBoard);
  const createBoardMutation = useCreateBoard();
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);
  const [showGrid, setShowGrid] = React.useState(true);
  const [userAvatar, setUserAvatar] = React.useState<string>("");
  const [titleDialogOpen, setTitleDialogOpen] = React.useState(false);
  const [slugDialogOpen, setSlugDialogOpen] = React.useState(false);

  // User-Daten aus AppWrite in das Format für User-Menü umwandeln
  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";
  const userInitials = getInitials(userName);

  // Avatar-URL aus AppWrite Storage abrufen
  React.useEffect(() => {
    function fetchAvatarUrl() {
      if (!user) {
        setUserAvatar("");
        return;
      }

      // Prüfe verschiedene mögliche Feldnamen für Avatar-ID
      // AppWrite User kann Avatar-ID in prefs oder als direktes Feld haben
      type UserWithAvatar = typeof user & {
        avatarId?: string;
        imageId?: string;
        avatar?: string;
        prefs?: Models.Preferences & {
          avatarId?: string;
          imageId?: string;
          avatar?: string;
        };
      };

      const userWithAvatar = user as UserWithAvatar;
      const avatarIdOrUrl =
        userWithAvatar.avatarId ||
        userWithAvatar.imageId ||
        userWithAvatar.avatar ||
        userWithAvatar.prefs?.avatarId ||
        userWithAvatar.prefs?.imageId ||
        userWithAvatar.prefs?.avatar;

      if (!avatarIdOrUrl) {
        setUserAvatar("");
        return;
      }

      // Wenn bereits eine vollständige URL, direkt verwenden
      if (
        typeof avatarIdOrUrl === "string" &&
        avatarIdOrUrl.startsWith("http")
      ) {
        setUserAvatar(avatarIdOrUrl);
        return;
      }

      // Bucket-ID aus Umgebungsvariable oder Standard-Wert
      const bucketId =
        process.env.NEXT_PUBLIC_APPWRITE_AVATAR_BUCKET_ID || "avatars";

      try {
        // Hole Preview-URL für Avatar-Bild (optimiert für Avatar-Größe: 128x128)
        // getFilePreview ist synchron und gibt eine URL zurück
        const avatarUrl = storage.getFilePreview(
          bucketId,
          avatarIdOrUrl,
          128,
          128
        );
        // getFilePreview gibt eine URL-String zurück
        setUserAvatar(String(avatarUrl));
      } catch (error) {
        // Bei Fehler (z.B. Datei nicht gefunden, keine Berechtigung) auf leeren String zurückfallen
        console.warn("Avatar konnte nicht geladen werden:", error);
        setUserAvatar("");
      }
    }

    fetchAvatarUrl();
  }, [user]);

  // Neues Board erstellen
  const handleNewBoard = React.useCallback(async () => {
    // Prüfe ob User eingeloggt ist
    if (!user?.$id) {
      toast.error("Bitte melde dich an, um ein neues Board zu erstellen");
      return;
    }

    try {
      // Erstelle neues Board mit Standardwerten
      const newBoard = await createBoardMutation.mutateAsync({
        userId: user.$id,
        boardData: {
          title: "Neues Board",
          grid_config: { columns: 4, gap: 16 },
          blocks: [],
        },
      });

      // Setze neues Board im Canvas-Store
      setCurrentBoard(newBoard);

      toast.success("Neues Board erfolgreich erstellt");
    } catch (error) {
      console.error("Fehler beim Erstellen des Boards:", error);
      toast.error("Fehler beim Erstellen des Boards", {
        description:
          error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
  }, [user?.$id, createBoardMutation, setCurrentBoard]);

  const handleOpenBoard = React.useCallback(() => {
    console.log("Board öffnen");
  }, []);

  const handleSave = React.useCallback(() => {
    console.log("Board speichern");
  }, []);

  const handleSaveAs = React.useCallback(() => {
    console.log("Board speichern unter...");
  }, []);

  const handleDuplicate = React.useCallback(() => {
    console.log("Board duplizieren");
  }, []);

  const handleSaveAsTemplate = React.useCallback(() => {
    console.log("Als Template speichern (Pro)");
  }, []);

  const handleExport = React.useCallback(() => {
    console.log("Board exportieren");
  }, []);

  const handleUndo = React.useCallback(() => {
    console.log("Rückgängig");
  }, []);

  const handleRedo = React.useCallback(() => {
    console.log("Wiederholen");
  }, []);

  const handleCut = React.useCallback(() => {
    console.log("Ausschneiden");
  }, []);

  const handleCopy = React.useCallback(() => {
    console.log("Kopieren");
  }, []);

  const handlePaste = React.useCallback(() => {
    console.log("Einfügen");
  }, []);

  const handleDelete = React.useCallback(() => {
    console.log("Löschen");
  }, []);

  const handleSelectAll = React.useCallback(() => {
    console.log("Alles auswählen");
  }, []);

  const handleTogglePreview = React.useCallback(() => {
    setIsPreviewMode((prev) => {
      const newValue = !prev;
      console.log(`Preview-Modus: ${newValue}`);
      return newValue;
    });
  }, []);

  const handleZoomIn = React.useCallback(() => {
    const newLevel = Math.min(zoomLevel + 10, 200);
    console.log(`Zoom: ${newLevel}%`);
    onZoomChange(newLevel);
  }, [zoomLevel, onZoomChange]);

  const handleZoomOut = React.useCallback(() => {
    const newLevel = Math.max(zoomLevel - 10, 50);
    console.log(`Zoom: ${newLevel}%`);
    onZoomChange(newLevel);
  }, [zoomLevel, onZoomChange]);

  const handleToggleGrid = React.useCallback((checked: boolean) => {
    setShowGrid(checked);
    console.log(`Raster anzeigen: ${checked}`);
  }, []);

  const handleBoardSettings = React.useCallback(() => {
    console.log("Board-Einstellungen");
  }, []);

  const handleChangeTitle = React.useCallback(() => {
    if (!currentBoard) {
      console.warn("Kein Board ausgewählt");
      return;
    }
    setTitleDialogOpen(true);
  }, [currentBoard]);

  const handleChangeSlug = React.useCallback(() => {
    if (!currentBoard) {
      console.warn("Kein Board ausgewählt");
      return;
    }
    setSlugDialogOpen(true);
  }, [currentBoard]);

  const handlePasswordProtection = React.useCallback(() => {
    console.log("Passwortschutz (Pro)");
  }, []);

  const handleCopyLink = React.useCallback(() => {
    console.log("Link kopieren");
  }, []);

  const handleGenerateQR = React.useCallback(() => {
    console.log("QR-Code generieren");
  }, []);

  const handleSendEmail = React.useCallback(() => {
    console.log("E-Mail senden");
  }, []);

  const handleAccessSettings = React.useCallback(() => {
    console.log("Zugriffseinstellungen (Pro)");
  }, []);

  const handleUpgradeToPro = React.useCallback(() => {
    console.log("Upgrade to Pro");
  }, []);

  const handleUserAccount = React.useCallback(() => {
    console.log("Account");
  }, []);

  const handleUserBilling = React.useCallback(() => {
    console.log("Billing");
  }, []);

  const handleUserNotifications = React.useCallback(() => {
    console.log("Notifications");
  }, []);

  const handleLogout = React.useCallback(() => {
    console.log("Logout (Platzhalter)");
    // TODO: Implementiere Logout mit AppWrite account.deleteSession()
  }, []);

  // Globale Keyboard-Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignoriere Shortcuts wenn der Benutzer in einem Input-Feld tippt
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;

      // Datei-Menü Shortcuts
      if (modifier && e.key === "s" && !shift) {
        e.preventDefault();
        handleSave();
      } else if (modifier && e.key === "s" && shift) {
        e.preventDefault();
        handleSaveAs();
      } else if (modifier && e.key === "n") {
        e.preventDefault();
        handleNewBoard();
      } else if (modifier && e.key === "o") {
        e.preventDefault();
        handleOpenBoard();
      } else if (modifier && e.key === "d") {
        e.preventDefault();
        handleDuplicate();
      }
      // Bearbeiten-Menü Shortcuts
      else if (modifier && e.key === "z" && !shift) {
        e.preventDefault();
        handleUndo();
      } else if (modifier && (e.key === "z" || e.key === "y") && shift) {
        e.preventDefault();
        handleRedo();
      } else if (modifier && e.key === "x") {
        e.preventDefault();
        handleCut();
      } else if (modifier && e.key === "c") {
        e.preventDefault();
        handleCopy();
      } else if (modifier && e.key === "v") {
        e.preventDefault();
        handlePaste();
      } else if (modifier && e.key === "a") {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (!target.tagName || target.tagName !== "INPUT") {
          e.preventDefault();
          handleDelete();
        }
      }
      // Ansicht-Menü Shortcuts
      else if (modifier && e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (modifier && e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      }
      // Board-Menü Shortcuts
      else if (modifier && e.key === ",") {
        e.preventDefault();
        handleBoardSettings();
      }
      // Teilen-Menü Shortcuts
      else if (modifier && e.key === "l") {
        e.preventDefault();
        handleCopyLink();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    handleSave,
    handleSaveAs,
    handleNewBoard,
    handleOpenBoard,
    handleDuplicate,
    handleUndo,
    handleRedo,
    handleCut,
    handleCopy,
    handlePaste,
    handleSelectAll,
    handleDelete,
    handleZoomIn,
    handleZoomOut,
    handleBoardSettings,
    handleCopyLink,
  ]);

  // Helper-Funktion für Keyboard-Shortcuts
  const getShortcut = (key: string) => {
    if (typeof window === "undefined") {
      return `Ctrl+${key}`;
    }

    // Prüfe userAgentData (experimentelle API) oder fallback zu platform
    const navigatorWithUA = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };

    const isMac =
      navigatorWithUA.userAgentData?.platform
        ?.toUpperCase()
        .includes("MAC") ??
      navigator.platform.toUpperCase().includes("MAC");

    const modifier = isMac ? "⌘" : "Ctrl";
    return `${modifier}+${key}`;
  };

  // Pro-Badge Komponente
  const ProBadge = () => (
    <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
      Pro
    </span>
  );

  return (
    <Menubar className="border-none shadow-none bg-transparent h-9 gap-0">
      {/* Datei-Menü */}
      <MenubarMenu>
        <MenubarTrigger className="text-sm px-3 py-1.5">Datei</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={handleNewBoard}>
            <File className="mr-2 h-4 w-4" />
            <span>Neues Board</span>
            <MenubarShortcut>{getShortcut("N")}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={handleOpenBoard}>
            <FolderOpen className="mr-2 h-4 w-4" />
            <span>Board öffnen</span>
            <MenubarShortcut>{getShortcut("O")}</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            <span>Speichern</span>
            <MenubarShortcut>{getShortcut("S")}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={handleSaveAs}>
            <FileDown className="mr-2 h-4 w-4" />
            <span>Speichern unter...</span>
            <MenubarShortcut>{getShortcut("Shift+S")}</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Duplizieren</span>
            <MenubarShortcut>{getShortcut("D")}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={handleSaveAsTemplate} disabled>
            <FileText className="mr-2 h-4 w-4" />
            <span>Als Template speichern</span>
            <ProBadge />
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            <span>Exportieren</span>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Bearbeiten-Menü */}
      <MenubarMenu>
        <MenubarTrigger className="text-sm px-3 py-1.5">
          Bearbeiten
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={handleUndo}>
            <Undo2 className="mr-2 h-4 w-4" />
            <span>Rückgängig</span>
            <MenubarShortcut>{getShortcut("Z")}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={handleRedo}>
            <Redo2 className="mr-2 h-4 w-4" />
            <span>Wiederholen</span>
            <MenubarShortcut>{getShortcut("Shift+Z")}</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleCut}>
            <Scissors className="mr-2 h-4 w-4" />
            <span>Ausschneiden</span>
            <MenubarShortcut>{getShortcut("X")}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={handleCopy}>
            <Clipboard className="mr-2 h-4 w-4" />
            <span>Kopieren</span>
            <MenubarShortcut>{getShortcut("C")}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={handlePaste}>
            <ClipboardPaste className="mr-2 h-4 w-4" />
            <span>Einfügen</span>
            <MenubarShortcut>{getShortcut("V")}</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleDelete} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Löschen</span>
            <MenubarShortcut>Del</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleSelectAll}>
            <MousePointerClick className="mr-2 h-4 w-4" />
            <span>Alles auswählen</span>
            <MenubarShortcut>{getShortcut("A")}</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Ansicht-Menü */}
      <MenubarMenu>
        <MenubarTrigger className="text-sm px-3 py-1.5">Ansicht</MenubarTrigger>
        <MenubarContent>
          <MenubarRadioGroup value={isPreviewMode ? "preview" : "builder"}>
            <MenubarRadioItem
              value="builder"
              onClick={() => !isPreviewMode || handleTogglePreview()}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              <span>Builder-Modus</span>
            </MenubarRadioItem>
            <MenubarRadioItem
              value="preview"
              onClick={() => isPreviewMode || handleTogglePreview()}
            >
              <Eye className="mr-2 h-4 w-4" />
              <span>Vorschau-Modus</span>
            </MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSeparator />
          <MenubarItem onClick={handleZoomIn}>
            <ZoomIn className="mr-2 h-4 w-4" />
            <span>Vergrößern</span>
            <MenubarShortcut>{getShortcut("=")}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={handleZoomOut}>
            <ZoomOut className="mr-2 h-4 w-4" />
            <span>Verkleinern</span>
            <MenubarShortcut>{getShortcut("-")}</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarCheckboxItem
            checked={showGrid}
            onCheckedChange={handleToggleGrid}
          >
            <Grid3x3 className="mr-2 h-4 w-4" />
            <span>Raster anzeigen</span>
          </MenubarCheckboxItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Board-Menü */}
      <MenubarMenu>
        <MenubarTrigger className="text-sm px-3 py-1.5">Board</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={handleBoardSettings}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Einstellungen</span>
            <MenubarShortcut>{getShortcut(",")}</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleChangeTitle}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Titel ändern</span>
          </MenubarItem>
          <MenubarItem onClick={handleChangeSlug}>
            <Link2 className="mr-2 h-4 w-4" />
            <span>Slug ändern</span>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handlePasswordProtection} disabled>
            <Lock className="mr-2 h-4 w-4" />
            <span>Passwortschutz</span>
            <ProBadge />
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Teilen-Menü */}
      <MenubarMenu>
        <MenubarTrigger className="text-sm px-3 py-1.5">Teilen</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={handleCopyLink}>
            <Link2 className="mr-2 h-4 w-4" />
            <span>Link kopieren</span>
            <MenubarShortcut>{getShortcut("L")}</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={handleGenerateQR}>
            <QrCode className="mr-2 h-4 w-4" />
            <span>QR-Code generieren</span>
          </MenubarItem>
          <MenubarItem onClick={handleSendEmail}>
            <Mail className="mr-2 h-4 w-4" />
            <span>E-Mail senden</span>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleAccessSettings} disabled>
            <Shield className="mr-2 h-4 w-4" />
            <span>Zugriffseinstellungen</span>
            <ProBadge />
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* User-Menü */}
      <MenubarMenu>
        <MenubarTrigger className="text-sm px-3 py-1.5">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5 rounded-lg">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback className="rounded-lg text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[120px] truncate">{userName}</span>
          </div>
        </MenubarTrigger>
        <MenubarContent>
          <MenubarLabel className="p-0 font-normal">
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
          </MenubarLabel>
          <MenubarSeparator />
          <MenubarItem onClick={handleUpgradeToPro}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Auf Pro upgraden</span>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleUserAccount}>
            <BadgeCheck className="mr-2 h-4 w-4" />
            <span>Konto</span>
          </MenubarItem>
          <MenubarItem onClick={handleUserBilling}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Abrechnung</span>
          </MenubarItem>
          <MenubarItem onClick={handleUserNotifications}>
            <Bell className="mr-2 h-4 w-4" />
            <span>Benachrichtigungen</span>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Abmelden</span>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Dialoge */}
      <BoardTitleDialog
        open={titleDialogOpen}
        onOpenChange={setTitleDialogOpen}
      />
      <BoardSlugDialog open={slugDialogOpen} onOpenChange={setSlugDialogOpen} />
    </Menubar>
  );
}
