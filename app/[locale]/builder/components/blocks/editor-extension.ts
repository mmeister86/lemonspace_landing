import { defineBasicExtension } from "prosekit/basic";
import { Union } from "prosekit/core";

export function defineExtension() {
  return defineBasicExtension();
}

export type EditorExtension = ReturnType<typeof defineExtension>;
