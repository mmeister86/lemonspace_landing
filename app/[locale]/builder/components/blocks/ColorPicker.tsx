import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette } from "lucide-react";
import { useEditor, useEditorDerivedValue } from "prosekit/react";
import { HexColorPicker } from "react-colorful";
import { EditorExtension } from "./editor-extension";
import { EditorState } from "prosekit/pm/state";
import { Mark } from "prosekit/pm/model";

export function ColorPicker() {
    const editor = useEditor<EditorExtension>();

    const currentColor = useEditorDerivedValue((editor) => {
        if (!editor.mounted) return "#000000";
        const state = editor.view.state;
        const { selection } = state;
        const { $from } = selection;
        const marks = $from.marks();
        const colorMark = marks.find((m: Mark) => m.type.name === "textColor");
        return (colorMark ? colorMark.attrs.color : "#000000") as string;
    });

    const handleColorChange = (color: string) => {
        editor.commands.setTextColor({ color });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Palette
                        className="h-4 w-4"
                        style={{ color: currentColor !== "#000000" ? currentColor : undefined }}
                    />
                    <span className="sr-only">Text Color</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-3">
                <HexColorPicker color={currentColor} onChange={handleColorChange} />
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => editor.commands.removeTextColor()}
                >
                    Reset Color
                </Button>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
