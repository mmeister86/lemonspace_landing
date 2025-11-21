"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { useBoards } from "@/lib/hooks/use-boards";
import { useUser } from "@/lib/contexts/user-context";
import { cn } from "@/lib/utils";

interface OpenBoardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OpenBoardDialog({ open, onOpenChange }: OpenBoardDialogProps) {
    const t = useTranslations("openBoard");
    const router = useRouter();
    const { user } = useUser();
    const { data: boards, isLoading } = useBoards(user?.id || null);
    const [searchQuery, setSearchQuery] = React.useState("");

    // Filter boards based on search query
    const filteredBoards = React.useMemo(() => {
        if (!boards) return [];
        if (!searchQuery.trim()) return boards;

        const query = searchQuery.toLowerCase();
        return boards.filter((board) =>
            board.title.toLowerCase().includes(query) ||
            (board.slug && board.slug.toLowerCase().includes(query))
        );
    }, [boards, searchQuery]);

    const handleOpenBoard = (slugOrId: string) => {
        onOpenChange(false);
        router.push(`/builder/${slugOrId}`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>
                        {t("description")}
                    </DialogDescription>
                    <div className="relative mt-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("searchPlaceholder")}
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </DialogHeader>

                <ScrollArea className="h-[400px] p-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p>Loading...</p>
                        </div>
                    ) : filteredBoards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                            <p>{t("noBoardsFound")}</p>
                        </div>
                    ) : (
                        <div className="grid gap-1 p-2">
                            {filteredBoards.map((board) => (
                                <button
                                    key={board.id}
                                    onClick={() => handleOpenBoard(board.slug || board.id)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg text-left transition-colors",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        "group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    )}
                                >
                                    <div className="flex flex-col gap-1 min-w-0">
                                        <span className="font-medium truncate">{board.title}</span>
                                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                                            <span className="truncate max-w-[200px]">/{board.slug || board.id}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {/* Fallback date formatting if updated_at is missing or invalid */}
                                                {board.updated_at ? new Date(board.updated_at).toLocaleDateString() : "-"}
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
