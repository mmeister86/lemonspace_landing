"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Edit2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { Block, BlockType } from "@/lib/types/board";

interface BlockEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block | null;
}

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

export function BlockEditor({ open, onOpenChange, block }: BlockEditorProps) {
  const updateBlock = useCanvasStore((state) => state.updateBlock);

  const currentSchema = block ? blockSchemas[block.type] || blockSchemas.text : blockSchemas.text;
  const form = useForm<BlockFormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: (block?.data as BlockFormData) || {},
  });

  if (!block) return null;

  const onSubmit = (data: BlockFormData) => {
    if (!block) return;

    updateBlock(block.id, {
      data,
    });

    onOpenChange(false);
  };

  const getFormFields = (type: BlockType) => {
    switch (type) {
      case "text":
        return (
          <Textarea
            {...form.register("content")}
            placeholder="Text eingeben..."
            rows={4}
          />
        );
      case "heading":
        return (
          <>
            <Input
              {...form.register("content")}
              placeholder="Überschrift eingeben..."
            />
            <Input
              type="number"
              {...form.register("level", { valueAsNumber: true })}
              placeholder="Überschriftenebene (1-6)"
              min={1}
              max={6}
            />
          </>
        );
      case "button":
        return (
          <>
            <Input
              {...form.register("text")}
              placeholder="Button-Text eingeben..."
            />
            <Input
              {...form.register("url")}
              placeholder="URL eingeben (z.B. https://beispiel.com)"
            />
          </>
        );
      case "image":
        return (
          <>
            <Input
              {...form.register("src")}
              placeholder="Bild-URL eingeben..."
            />
            <Input
              {...form.register("alt")}
              placeholder="Alt-Text eingeben..."
            />
          </>
        );
      case "video":
        return (
          <>
            <Input
              {...form.register("src")}
              placeholder="Video-URL eingeben..."
            />
            <Input
              {...form.register("poster")}
              placeholder="Poster-Bild-URL eingeben..."
            />
          </>
        );
      case "spacer":
        return (
          <Input
            type="number"
            {...form.register("height", { valueAsNumber: true })}
            placeholder="Höhe in Pixeln (0-200)"
            min={0}
            max={200}
          />
        );
      case "form":
        return (
          <>
            <Input
              {...form.register("title")}
              placeholder="Formular-Titel eingeben..."
            />
            <Textarea
              {...form.register("fields")}
              placeholder="Felder als JSON-Array eingeben..."
              rows={3}
            />
          </>
        );
      case "pricing":
        return (
          <>
            <Input
              {...form.register("title")}
              placeholder="Titel eingeben..."
            />
            <Input
              {...form.register("price")}
              placeholder="Preis eingeben..."
            />
            <Textarea
              {...form.register("description")}
              placeholder="Beschreibung eingeben..."
              rows={3}
            />
          </>
        );
      case "testimonial":
        return (
          <>
            <Textarea
              {...form.register("quote")}
              placeholder="Testimonial eingeben..."
              rows={3}
            />
            <Input
              {...form.register("author")}
              placeholder="Autor eingeben..."
            />
          </>
        );
      case "accordion":
        return (
          <>
            <Input
              {...form.register("title")}
              placeholder="Titel eingeben..."
            />
            <Textarea
              {...form.register("content")}
              placeholder="Inhalt eingeben..."
              rows={3}
            />
          </>
        );
      case "code":
        return (
          <>
            <Input
              {...form.register("language")}
              placeholder="Programmiersprache (z.B. javascript)"
            />
            <Textarea
              {...form.register("code")}
              placeholder="Code eingeben..."
              rows={8}
              className="font-mono text-sm"
            />
          </>
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
    };
    return titles[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {getBlockTitle(block.type)} bearbeiten
          </DialogTitle>
          <DialogDescription>
            Passen Sie den Inhalt des Blocks an. Die Änderungen werden automatisch
            gespeichert.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            {getFormFields(block.type)}
          </div>
          {Object.entries(form.formState.errors).map(([field, error]) => (
            <p key={field} className="text-sm text-destructive">
              {error?.message as string}
            </p>
          ))}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-1" />
              Abbrechen
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-1" />
              Speichern
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BlockEditButton({ block }: { block: Block }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="absolute top-2 left-2 h-8 w-8 rounded-full shadow-md hover:shadow-lg transition-shadow"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
      <BlockEditor open={open} onOpenChange={setOpen} block={block} />
    </>
  );
}
