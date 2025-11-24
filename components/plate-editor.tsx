'use client';

import React from 'react';
import { Plate } from 'platejs/react';
import { usePlateEditor } from 'platejs/react';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { FixedToolbar } from '@/components/ui/fixed-toolbar';
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button';
import { FontColorToolbarButton } from '@/components/ui/font-color-toolbar-button';
import { BasicNodesKit } from '@/components/editor/plugins/basic-nodes-kit';
import { LinkPlugin } from '@platejs/link/react';
import { ListPlugin } from '@platejs/list/react';
import { LinkElement } from '@/components/ui/link-element';
import { ListElement, ListItemElement } from '@/components/ui/list-element';
import { ToolbarGroup, ToolbarSeparator } from '@/components/ui/toolbar';

interface PlateEditorProps {
    initialValue?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    onChange?: (value: any[]) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
    readOnly?: boolean;
    className?: string;
}

export function PlateEditor({ initialValue, onChange, readOnly, className }: PlateEditorProps) {
    const editor = usePlateEditor({
        plugins: [
            ...BasicNodesKit,
            LinkPlugin.configure({
                render: { node: LinkElement },
            }),
            ListPlugin.configure({
                render: {
                    node: ({ element, ...props }) => {
                        if (element.type === 'ul') {
                            return <ListElement variant="ul" element={element} {...props} />;
                        }
                        if (element.type === 'ol') {
                            return <ListElement variant="ol" element={element} {...props} />;
                        }
                        if (element.type === 'li') {
                            return <ListItemElement element={element} {...props} />;
                        }
                        return null;
                    },
                },
            }),
        ],
        value: initialValue,
    });

    return (
        <Plate
            editor={editor}
            readOnly={readOnly}
            onChange={({ value }) => {
                onChange?.(value);
            }}
        >
            {!readOnly && (
                <FixedToolbar>
                    <ToolbarGroup>
                        <MarkToolbarButton nodeType="bold" tooltip="Bold (⌘+B)">
                            <span className="font-bold">B</span>
                        </MarkToolbarButton>
                        <MarkToolbarButton nodeType="italic" tooltip="Italic (⌘+I)">
                            <span className="italic">I</span>
                        </MarkToolbarButton>
                        <MarkToolbarButton nodeType="underline" tooltip="Underline (⌘+U)">
                            <span className="underline">U</span>
                        </MarkToolbarButton>
                        <MarkToolbarButton nodeType="strikethrough" tooltip="Strikethrough (⌘+Shift+X)">
                            <span className="line-through">S</span>
                        </MarkToolbarButton>
                        <MarkToolbarButton nodeType="code" tooltip="Code (⌘+E)">
                            <span className="font-mono">{'<>'}</span>
                        </MarkToolbarButton>
                    </ToolbarGroup>

                    <ToolbarSeparator />

                    <ToolbarGroup>
                        <FontColorToolbarButton nodeType="color" tooltip="Text Color">
                            <span className="font-bold text-muted-foreground">A</span>
                        </FontColorToolbarButton>
                    </ToolbarGroup>

                    <ToolbarSeparator />

                    <ToolbarGroup>
                        {/* Note: List toolbar buttons would need proper implementation with toggleList command */}
                        {/* For now we can add simple buttons if needed, or rely on markdown shortcuts */}
                    </ToolbarGroup>
                </FixedToolbar>
            )}

            <EditorContainer>
                <Editor placeholder="Type something..." className={className} />
            </EditorContainer>
        </Plate>
    );
}
