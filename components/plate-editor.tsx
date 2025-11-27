'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Plate } from 'platejs/react';
import { usePlateEditor } from 'platejs/react';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { FixedToolbar } from '@/components/ui/fixed-toolbar';
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button';
import { FontColorToolbarButton } from '@/components/ui/font-color-toolbar-button';
import { TurnIntoToolbarButton } from '@/components/ui/turn-into-toolbar-button';
import { AlignToolbarButton } from '@/components/ui/align-toolbar-button';
import { FontSizeToolbarButton } from '@/components/ui/font-size-toolbar-button';
import { IndentToolbarButton, OutdentToolbarButton } from '@/components/ui/indent-toolbar-button';
import { BasicNodesKit } from '@/components/editor/plugins/basic-nodes-kit';
import { DndKit } from '@/components/editor/plugins/dnd-kit';
import { LinkPlugin } from '@platejs/link/react';
import { ListPlugin } from '@platejs/list/react';
import { BlockSelectionPlugin } from '@platejs/selection/react';
import { LinkElement } from '@/components/ui/link-element';
import { ListElement, ListItemElement } from '@/components/ui/list-element';
import { ToolbarGroup, ToolbarSeparator } from '@/components/ui/toolbar';

interface PlateEditorProps {
    initialValue?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    onChange?: (value: any[]) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
    readOnly?: boolean;
    className?: string;
    placeholder?: string;
}

export function PlateEditor({ initialValue, onChange, readOnly, className, placeholder }: PlateEditorProps) {
    const t = useTranslations('editor');
    const defaultPlaceholder = placeholder || t('placeholder');

    const editor = usePlateEditor({
        plugins: [
            ...BasicNodesKit,
            ...DndKit,
            BlockSelectionPlugin,
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
                        <TurnIntoToolbarButton />
                        <FontSizeToolbarButton />
                    </ToolbarGroup>

                    <ToolbarSeparator />

                    <ToolbarGroup>
                        <MarkToolbarButton nodeType="bold" tooltip={t('toolbar.bold')}>
                            <span className="font-bold">B</span>
                        </MarkToolbarButton>
                        <MarkToolbarButton nodeType="italic" tooltip={t('toolbar.italic')}>
                            <span className="italic">I</span>
                        </MarkToolbarButton>
                        <MarkToolbarButton nodeType="underline" tooltip={t('toolbar.underline')}>
                            <span className="underline">U</span>
                        </MarkToolbarButton>
                        <MarkToolbarButton nodeType="strikethrough" tooltip={t('toolbar.strikethrough')}>
                            <span className="line-through">S</span>
                        </MarkToolbarButton>
                        <MarkToolbarButton nodeType="code" tooltip={t('toolbar.code')}>
                            <span className="font-mono">{'<>'}</span>
                        </MarkToolbarButton>
                    </ToolbarGroup>

                    <ToolbarSeparator />

                    <ToolbarGroup>
                        <FontColorToolbarButton nodeType="color" tooltip={t('toolbar.textColor')}>
                            <span className="font-bold text-muted-foreground">A</span>
                        </FontColorToolbarButton>
                        <AlignToolbarButton />
                        <OutdentToolbarButton />
                        <IndentToolbarButton />
                    </ToolbarGroup>
                </FixedToolbar>
            )}

            <EditorContainer>
                <Editor placeholder={defaultPlaceholder} className={className} />
            </EditorContainer>
        </Plate>
    );
}
