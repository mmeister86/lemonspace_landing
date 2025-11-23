import { useEditor } from "prosekit/react";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Code,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    Link as LinkIcon,
    Unlink,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EditorExtension } from "./editor-extension";
import { ColorPicker } from "./ColorPicker";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EditorToolbarProps {
    blockId: string;
    className?: string;
}

export function EditorToolbar({ blockId, className }: EditorToolbarProps) {
    const editor = useEditor<EditorExtension>();
    const [linkUrl, setLinkUrl] = useState("");
    const [isLinkOpen, setIsLinkOpen] = useState(false);

    const handleLinkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (linkUrl) {
            editor.commands.toggleLink({ href: linkUrl });
            setIsLinkOpen(false);
            setLinkUrl("");
        }
    };

    const handleUnlink = () => {
        editor.commands.removeLink();
        setIsLinkOpen(false);
    };

    return (
        <div
            className={cn(
                "flex items-center gap-1 p-1 border-b bg-background sticky top-0 z-10 flex-wrap",
                className
            )}
        >
            <ToggleGroup type="multiple" className="justify-start">
                <ToggleGroupItem
                    value="bold"
                    aria-label="Toggle bold"
                    onClick={() => editor.commands.toggleBold()}
                >
                    <Bold className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                    value="italic"
                    aria-label="Toggle italic"
                    onClick={() => editor.commands.toggleItalic()}
                >
                    <Italic className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                    value="underline"
                    aria-label="Toggle underline"
                    onClick={() => editor.commands.toggleUnderline()}
                >
                    <Underline className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                    value="strike"
                    aria-label="Toggle strikethrough"
                    onClick={() => editor.commands.toggleStrike()}
                >
                    <Strikethrough className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                    value="code"
                    aria-label="Toggle code"
                    onClick={() => editor.commands.toggleCode()}
                >
                    <Code className="h-4 w-4" />
                </ToggleGroupItem>
            </ToggleGroup>

            <div className="w-px h-6 bg-border mx-1" />

            <ToggleGroup type="single" className="justify-start">
                <ToggleGroupItem
                    value="h1"
                    aria-label="Heading 1"
                    onClick={() => editor.commands.toggleHeading({ level: 1 })}
                >
                    <Heading1 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                    value="h2"
                    aria-label="Heading 2"
                    onClick={() => editor.commands.toggleHeading({ level: 2 })}
                >
                    <Heading2 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                    value="h3"
                    aria-label="Heading 3"
                    onClick={() => editor.commands.toggleHeading({ level: 3 })}
                >
                    <Heading3 className="h-4 w-4" />
                </ToggleGroupItem>
            </ToggleGroup>

            <div className="w-px h-6 bg-border mx-1" />

            <ToggleGroup type="single" className="justify-start">
                <ToggleGroupItem
                    value="bulletList"
                    aria-label="Bullet List"
                    onClick={() => editor.commands.toggleList({ kind: "bullet" })}
                >
                    <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                    value="orderedList"
                    aria-label="Ordered List"
                    onClick={() => editor.commands.toggleList({ kind: "ordered" })}
                >
                    <ListOrdered className="h-4 w-4" />
                </ToggleGroupItem>
            </ToggleGroup>

            <div className="w-px h-6 bg-border mx-1" />

            <ColorPicker />

            <DropdownMenu open={isLinkOpen} onOpenChange={setIsLinkOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <LinkIcon className="h-4 w-4" />
                        <span className="sr-only">Link</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="p-3 w-60">
                    <form onSubmit={handleLinkSubmit} className="flex flex-col gap-2">
                        <Input
                            placeholder="https://example.com"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            className="h-8"
                        />
                        <div className="flex gap-2">
                            <Button type="submit" size="sm" className="flex-1 h-8">
                                Save
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2"
                                onClick={handleUnlink}
                                title="Remove Link"
                            >
                                <Unlink className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-6 bg-border mx-1" />

            <div className="flex items-center gap-1">
                <Toggle
                    size="sm"
                    aria-label="Undo"
                    onClick={() => editor.commands.undo()}
                >
                    <Undo className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    aria-label="Redo"
                    onClick={() => editor.commands.redo()}
                >
                    <Redo className="h-4 w-4" />
                </Toggle>
            </div>
        </div>
    );
}
