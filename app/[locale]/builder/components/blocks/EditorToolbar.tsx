"use client";

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
} from "lucide-react";
import { useMemo } from "react";
import { EditorExtension } from "./editor-extension";
import { BlockDeleteButton } from "../BlockDeleteButton";

interface EditorToolbarProps {
    blockId: string;
}

export function EditorToolbar({ blockId }: EditorToolbarProps) {
    const editor = useEditor<EditorExtension>();

    // Helper to check if a mark is active
    const isMarkActive = (type: string) => {
        // ProseKit doesn't expose isActive directly on editor, we might need to use useKeymap or similar
        // But for now let's try to use the editor state if available or just rely on toggle behavior
        // Actually, ProseKit's useEditor returns the editor instance which has methods.
        // Let's assume for now we just trigger commands.
        // To get active state, we usually need a selector or useEditorState.
        return false;
    };

    return (
        <div className="flex items-center gap-1 p-1 border-b bg-background sticky top-0 z-10">
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

            <div className="flex-1" />

            <BlockDeleteButton
                blockId={blockId}
                variant="ghost"
                size="sm"
                className="h-8 w-8 relative top-0 right-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            />
        </div>
    );
}
