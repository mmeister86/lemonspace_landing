import { defineMarkSpec, defineCommands, union } from "prosekit/core";

export function defineTextColor() {
    return union([
        defineMarkSpec({
            name: "textColor",
            attrs: {
                color: { default: null },
            },
            parseDOM: [
                {
                    style: "color",
                    getAttrs: (value) => {
                        return { color: value };
                    },
                },
            ],
            toDOM: (node) => {
                return ["span", { style: `color: ${node.attrs.color}` }, 0];
            },
        }),
        defineCommands({
            setTextColor: ({ color }: { color: string }) => {
                return (state, dispatch) => {
                    const { selection, schema } = state;
                    const { from, to, empty } = selection;
                    if (empty) return false;

                    if (dispatch) {
                        const markType = schema.marks.textColor;
                        if (!markType) return false;
                        const tr = state.tr.addMark(from, to, markType.create({ color }));
                        dispatch(tr);
                    }
                    return true;
                };
            },
            removeTextColor: () => {
                return (state, dispatch) => {
                    const { selection, schema } = state;
                    const { from, to, empty } = selection;
                    if (empty) return false;

                    if (dispatch) {
                        const markType = schema.marks.textColor;
                        if (!markType) return false;
                        const tr = state.tr.removeMark(from, to, markType);
                        dispatch(tr);
                    }
                    return true;
                };
            },
        }),
    ]);
}
