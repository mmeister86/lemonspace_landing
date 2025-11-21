"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
    FileDown,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
} from "@/components/ui/menubar";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/contexts/user-context";
import { BoardTitleDialog } from "./BoardTitleDialog";
import { BoardSlugDialog } from "./BoardSlugDialog";
import { CreateBoardDialog } from "./CreateBoardDialog";
import { OpenBoardDialog } from "./OpenBoardDialog";
import { DeleteBoardDialog } from "./DeleteBoardDialog";
import { SaveAsBoardDialog } from "./SaveAsBoardDialog";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useCreateBoard } from "@/lib/hooks/use-boards";
import { generateSlug } from "@/lib/services/board-service";
import { toast } from "sonner";



interface BuilderMenubarProps {
    zoomLevel: number;
    onZoomChange: (level: number) => void;
    onSave: () => Promise<boolean>;
}

export function BuilderMenubar({
    zoomLevel,
    onZoomChange,
    onSave,
}: BuilderMenubarProps) {
    const { user } = useUser();
    const router = useRouter();
    const t = useTranslations('createBoard');
    const tMenubar = useTranslations('menubar');
    const tSaveAs = useTranslations('saveAsBoard');
    const currentBoard = useCanvasStore((state) => state.currentBoard);
    const blocks = useCanvasStore((state) => state.blocks);
    const createBoardMutation = useCreateBoard();

    // Save state from store
    const saveStatus = useCanvasStore((state) => state.saveStatus);
    const lastSavedAt = useCanvasStore((state) => state.lastSavedAt);
    const hasUnsavedChanges = useCanvasStore((state) => state.hasUnsavedChanges);
    const isAutosaveEnabled = useCanvasStore((state) => state.isAutosaveEnabled);
    const setAutosaveEnabled = useCanvasStore((state) => state.setAutosaveEnabled);

    const [isPreviewMode, setIsPreviewMode] = React.useState(false);
    const [showGrid, setShowGrid] = React.useState(true);
    const [titleDialogOpen, setTitleDialogOpen] = React.useState(false);
    const [slugDialogOpen, setSlugDialogOpen] = React.useState(false);
    const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
    const [openBoardDialogOpen, setOpenBoardDialogOpen] = React.useState(false);
    const [deleteBoardDialogOpen, setDeleteBoardDialogOpen] = React.useState(false);
    const [saveAsDialogOpen, setSaveAsDialogOpen] = React.useState(false);

    // Neues Board erstellen
    const handleNewBoard = React.useCallback(() => {
        // Prüfe ob User eingeloggt ist
        if (!user?.id) {
            toast.error(t('error.notLoggedIn'));
            return;
        }

        // Öffne den CreateBoardDialog
        setCreateDialogOpen(true);
    }, [user?.id, t]);

    const handleOpenBoard = React.useCallback(() => {
        setOpenBoardDialogOpen(true);
    }, []);

    const handleSave = React.useCallback(async () => {
        await onSave();
    }, [onSave]);

    const handleSaveAs = React.useCallback(() => {
        if (!currentBoard) {
            return;
        }
        setSaveAsDialogOpen(true);
    }, [currentBoard]);

    const handleDuplicate = React.useCallback(async () => {
        if (!user?.id || !currentBoard) {
            return;
        }

        const newTitle = tSaveAs("copyOf", { title: currentBoard.title });
        const newSlug = generateSlug(newTitle);

        console.log(`Duplicating board with ${blocks.length} blocks`);

        // Regenerate block IDs to ensure uniqueness
        const newBlocks = blocks.map(block => ({
            ...block,
            id: crypto.randomUUID()
        }));

        const toastId = toast.loading(tSaveAs("saving"));

        try {
            const newBoard = await createBoardMutation.mutateAsync({
                title: newTitle,
                slug: newSlug,
                grid_config: currentBoard.grid_config || { columns: 4, gap: 16 },
                blocks: newBlocks,
            });

            toast.dismiss(toastId);
            toast.success(tSaveAs("success"));

            // Redirect to new board
            const boardIdentifier = newBoard.slug || newBoard.id;
            router.push(`/builder/${boardIdentifier}`);
        } catch (error) {
            console.error("Failed to duplicate board:", error);
            toast.dismiss(toastId);
            toast.error("Failed to duplicate board");
        }
    }, [user?.id, currentBoard, tSaveAs, createBoardMutation, blocks, router]);

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

    const handleDeleteBoard = React.useCallback(() => {
        if (!currentBoard) {
            return;
        }
        setDeleteBoardDialogOpen(true);
    }, [currentBoard]);

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

    const handleToggleAutosave = React.useCallback((checked: boolean) => {
        setAutosaveEnabled(checked);
        console.log(`Autosave: ${checked}`);
    }, [setAutosaveEnabled]);

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

    // Status Indicator Component
    const SaveStatusIndicator = () => {
        const [shouldShowSaved, setShouldShowSaved] = React.useState(false);
        const [displayStatus, setDisplayStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error' | 'unsaved'>('idle');

        React.useEffect(() => {
            if (saveStatus === 'saving') {
                setDisplayStatus('saving');
                setShouldShowSaved(false);
            } else if (saveStatus === 'error') {
                setDisplayStatus('error');
            } else if (saveStatus === 'saved') {
                setDisplayStatus('saved');
                setShouldShowSaved(true);
                const timer = setTimeout(() => {
                    setShouldShowSaved(false);
                }, 2000);
                return () => clearTimeout(timer);
            } else if (hasUnsavedChanges) {
                setDisplayStatus('unsaved');
            } else {
                // Idle and no changes
                setDisplayStatus('idle');
            }
        }, [saveStatus, hasUnsavedChanges]);

        return (
            <div className="flex items-center h-full overflow-hidden">
                <AnimatePresence mode="wait">
                    {displayStatus === 'saving' && (
                        <motion.div
                            key="saving"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground px-2"
                        >
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Speichern...</span>
                        </motion.div>
                    )}

                    {displayStatus === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-1.5 text-xs text-destructive px-2"
                        >
                            <AlertCircle className="h-3 w-3" />
                            <span>Fehler</span>
                        </motion.div>
                    )}

                    {displayStatus === 'saved' && shouldShowSaved && (
                        <motion.div
                            key="saved"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground px-2"
                        >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Gespeichert</span>
                        </motion.div>
                    )}

                    {displayStatus === 'unsaved' && (
                        // Only show if we are not showing "Saved" (which is handled by mode="wait" and state logic)
                        // But wait, if I type, it goes to 'unsaved'.
                        // If 'saved' is still showing (timeout not done), do we interrupt it?
                        // The useEffect updates displayStatus immediately.
                        // So yes, it will interrupt 'saved' and show 'unsaved'.
                        // But 'unsaved' usually is just a dot.
                        // Does the user want the dot to animate in/out too?
                        // "make the save animation..."
                        // Let's animate the dot too for consistency.
                        <motion.div
                            key="unsaved"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground px-2"
                        >
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                            <span>Ungespeichert</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

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
                    <MenubarSeparator />
                    <MenubarItem onClick={handleDeleteBoard} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>{tMenubar('deleteBoard.title')}</span>
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
                    <MenubarSeparator />
                    <MenubarCheckboxItem
                        checked={isAutosaveEnabled}
                        onCheckedChange={handleToggleAutosave}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        <span>{tMenubar('board.autosave')}</span>
                    </MenubarCheckboxItem>
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

            <div className="ml-2 border-l pl-2">
                <SaveStatusIndicator />
            </div>

            {/* Dialoge */}
            <CreateBoardDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
            />
            <BoardTitleDialog
                open={titleDialogOpen}
                onOpenChange={setTitleDialogOpen}
            />
            <BoardSlugDialog open={slugDialogOpen} onOpenChange={setSlugDialogOpen} />
            <OpenBoardDialog
                open={openBoardDialogOpen}
                onOpenChange={setOpenBoardDialogOpen}
            />
            <DeleteBoardDialog
                open={deleteBoardDialogOpen}
                onOpenChange={setDeleteBoardDialogOpen}
            />
            <SaveAsBoardDialog
                open={saveAsDialogOpen}
                onOpenChange={setSaveAsDialogOpen}
            />
        </Menubar >
    );
}
