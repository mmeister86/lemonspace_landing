import { defineBasicExtension } from "prosekit/basic";
import { defineTextColor } from "./text-color-extension";
import { union } from "prosekit/core";
import { defineLink } from "prosekit/extensions/link";

export function defineExtension() {
    return union([defineBasicExtension(), defineTextColor(), defineLink()]);
}

export type EditorExtension = ReturnType<typeof defineExtension>;
