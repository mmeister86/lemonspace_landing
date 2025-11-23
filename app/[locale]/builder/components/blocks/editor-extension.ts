import { defineBasicExtension } from "prosekit/basic";
import { defineTextColor } from "./text-color-extension";
import { union } from "prosekit/core";

export function defineExtension() {
    return union([defineBasicExtension(), defineTextColor()]);
}

export type EditorExtension = ReturnType<typeof defineExtension>;
