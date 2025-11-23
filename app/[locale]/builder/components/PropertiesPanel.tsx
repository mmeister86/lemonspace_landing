import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { Block, BlockType } from "@/lib/types/board";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

import { BlockDeleteDialog } from "./BlockDeleteDialog";
import { TextProperties } from "./properties/TextProperties";

// ... (keep blockSchemas and BlockFormData as is)

const blockSchemas = {
  text: z.object({
    content: z.string().min(1, "Text darf nicht leer sein"),
  }),
  heading: z.object({
    content: z.string().min(1, "Überschrift darf nicht leer sein"),
    level: z.number().int().min(1).max(6).default(2),
  }),
  button: z.object({
    text: z.string().min(1, "Button-Text darf nicht leer sein"),
    url: z.string().url("Ungültige URL").optional().or(z.literal("")),
  }),
  image: z.object({
    src: z.string().min(1, "Bild-URL darf nicht leer sein"),
    alt: z.string().optional(),
  }),
  video: z.object({
    src: z.string().min(1, "Video-URL darf nicht leer sein"),
    poster: z.string().optional(),
  }),
  spacer: z.object({
    height: z.number().int().min(0).max(200).default(20),
  }),
  form: z.object({
    title: z.string().min(1, "Formular-Titel darf nicht leer sein"),
    fields: z.array(z.string()).optional(),
  }),
  pricing: z.object({
    title: z.string().min(1, "Preis-Titel darf nicht leer sein"),
    price: z.string().min(1, "Preis darf nicht leer sein"),
    description: z.string().optional(),
  }),
  testimonial: z.object({
    quote: z.string().min(1, "Testimonial darf nicht leer sein"),
    author: z.string().min(1, "Autor darf nicht leer sein"),
  }),
  accordion: z.object({
    title: z.string().min(1, "Titel darf nicht leer sein"),
    content: z.string().min(1, "Inhalt darf nicht leer sein"),
  }),
  code: z.object({
    code: z.string().min(1, "Code darf nicht leer sein"),
    language: z.string().default("javascript"),
  }),
};

type BlockFormData = Record<string, unknown>;

export function PropertiesPanel() {
  const selectedBlockIds = useCanvasStore((state) => state.selectedBlockIds);
  const blocks = useCanvasStore((state) => state.blocks);
  const updateBlock = useCanvasStore((state) => state.updateBlock);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const removeBlock = useCanvasStore((state) => state.removeBlock);
  const selectBlock = useCanvasStore((state) => state.selectBlock);

  const block =
    selectedBlockIds.length === 1
      ? blocks.find((b) => b.id === selectedBlockIds[0])
      : undefined;

  const [lastBlock, setLastBlock] = useState<Block | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (block) {
      setLastBlock(block);
    }
  }, [block]);

  const displayBlock =
    block || (selectedBlockIds.length === 0 ? lastBlock : undefined);

  const currentSchema = displayBlock
    ? displayBlock.type === "grid"
      ? blockSchemas.text
      : blockSchemas[displayBlock.type] || blockSchemas.text
    : blockSchemas.text;

  const form = useForm<BlockFormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: (displayBlock?.data as BlockFormData) || {},
    mode: "onChange", // Auto-save on change
  });

  // Update form values when selected block changes
  useEffect(() => {
    if (block) {
      form.reset((block.data as BlockFormData) || {});
    }
  }, [block, form]);

  // Auto-save changes with debouncing to prevent flooding undo history
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const subscription = form.watch((value) => {
      if (block && form.formState.isValid) {
        // Clear any existing timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Set a new timeout to debounce the update
        timeoutId = setTimeout(() => {
          updateBlock(block.id, {
            data: value as BlockFormData,
          });
        }, 300); // 300ms debounce delay
      }
    });

    return () => {
      // Clean up subscription and timeout
      subscription.unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [form, block, updateBlock]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      selectBlock(null);
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const getFormFields = (type: BlockType) => {
    switch (type) {
      case "text":
        if (!displayBlock) return null;
        return <TextProperties block={displayBlock} />;
      case "heading":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Überschrift</label>
              <Input
                {...form.register("content")}
                placeholder="Überschrift eingeben..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ebene (1-6)</label>
              <Input
                type="number"
                {...form.register("level", { valueAsNumber: true })}
                placeholder="Überschriftenebene"
                min={1}
                max={6}
              />
            </div>
          </div>
        );
      case "button":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Button-Text</label>
              <Input
                {...form.register("text")}
                placeholder="Button-Text eingeben..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ziel-URL</label>
              <Input {...form.register("url")} placeholder="URL eingeben..." />
            </div>
          </div>
        );
      case "image":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bild-URL</label>
              <Input
                {...form.register("src")}
                placeholder="Bild-URL eingeben..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Alt-Text</label>
              <Input
                {...form.register("alt")}
                placeholder="Alt-Text eingeben..."
              />
            </div>
          </div>
        );
      case "video":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Video-URL</label>
              <Input
                {...form.register("src")}
                placeholder="Video-URL eingeben..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Poster-Bild-URL</label>
              <Input
                {...form.register("poster")}
                placeholder="Poster-Bild-URL eingeben..."
              />
            </div>
          </div>
        );
      case "spacer":
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">Höhe (px)</label>
            <Input
              type="number"
              {...form.register("height", { valueAsNumber: true })}
              placeholder="Höhe in Pixeln"
              min={0}
              max={200}
            />
          </div>
        );
      case "form":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Titel</label>
              <Input
                {...form.register("title")}
                placeholder="Formular-Titel eingeben..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Felder (JSON)</label>
              <Textarea
                {...form.register("fields")}
                placeholder="Felder als JSON-Array eingeben..."
                rows={3}
              />
            </div>
          </div>
        );
      case "pricing":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Titel</label>
              <Input
                {...form.register("title")}
                placeholder="Titel eingeben..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preis</label>
              <Input
                {...form.register("price")}
                placeholder="Preis eingeben..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Beschreibung</label>
              <Textarea
                {...form.register("description")}
                placeholder="Beschreibung eingeben..."
                rows={3}
              />
            </div>
          </div>
        );
      case "testimonial":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Zitat</label>
              <Textarea
                {...form.register("quote")}
                placeholder="Testimonial eingeben..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Autor</label>
              <Input
                {...form.register("author")}
                placeholder="Autor eingeben..."
              />
            </div>
          </div>
        );
      case "accordion":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Titel</label>
              <Input
                {...form.register("title")}
                placeholder="Titel eingeben..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Inhalt</label>
              <Textarea
                {...form.register("content")}
                placeholder="Inhalt eingeben..."
                rows={3}
              />
            </div>
          </div>
        );
      case "code":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sprache</label>
              <Input
                {...form.register("language")}
                placeholder="z.B. javascript"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Code</label>
              <Textarea
                {...form.register("code")}
                placeholder="Code eingeben..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getBlockTitle = (type: BlockType) => {
    const titles: Record<BlockType, string> = {
      text: "Text",
      heading: "Überschrift",
      image: "Bild",
      button: "Button",
      spacer: "Abstandhalter",
      video: "Video",
      form: "Formular",
      pricing: "Preis-Tabelle",
      testimonial: "Testimonial",
      accordion: "Akkordeon",
      code: "Code",
      grid: "Layout-Grid",
    };
    return titles[type] || type;
  };

  if (selectedBlockIds.length > 1) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col items-center justify-center flex-1 text-center p-4 text-muted-foreground">
          <p className="text-sm font-medium mb-2">
            {selectedBlockIds.length} Blöcke ausgewählt
          </p>
          <p className="text-xs mb-4">
            Bearbeitung mehrerer Blöcke ist noch nicht verfügbar.
          </p>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Alle löschen
          </Button>
        </div>
        <BlockDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          blockIds={selectedBlockIds}
        />
      </div>
    );
  }

  if (!displayBlock) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
        <p className="text-sm">
          Wähle einen Block aus, um seine Einstellungen zu bearbeiten.
        </p>
      </div>
    );
  }

  // Do not show the properties sheet for grid blocks
  if (block?.type === "grid") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
        <p className="text-sm">Grid-Einstellungen sind noch nicht verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h3 className="font-medium leading-none mb-2">
          {getBlockTitle(displayBlock.type)}
        </h3>
        <p className="text-sm text-muted-foreground">
          Eigenschaften bearbeiten
        </p>
      </div>

      <form
        className="flex-1 flex flex-col"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex-1 space-y-6">
          {getFormFields(displayBlock.type)}
        </div>

        <div className="mt-auto pt-6 space-y-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Block löschen
          </Button>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Erweitert</h4>
            <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              ID: {displayBlock.id}
            </div>
          </div>
        </div>
      </form>
      <BlockDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        blockIds={[displayBlock.id]}
      />
    </div>
  );
}
