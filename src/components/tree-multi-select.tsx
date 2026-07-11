"use client";

import { useTranslations } from "next-intl";

export type TreeOption = { id: string; name: string };

/**
 * The shared "which trees?" picker used by the plan-care, fertilize, and
 * batch-log flows. Selection is controlled by the parent (a `Set<string>`); the
 * checkboxes all share `name="treeId"`, so checked boxes submit their id natively
 * via FormData — the `Set` drives only the UI (the select-all/clear toggle, the
 * count, the disabled submit). Render it inside the parent's `<form>`.
 */
export function TreeMultiSelect({
  trees,
  selected,
  onToggle,
  onToggleAll,
}: {
  trees: TreeOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  /** Called with the desired next state: true = select every tree, false = clear. */
  onToggleAll: (selectAll: boolean) => void;
}) {
  const t = useTranslations("treePicker");
  const allSelected = trees.length > 0 && selected.size === trees.length;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{t("whichTrees")}</legend>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium" aria-hidden="true">
          {t("whichTrees")}
        </span>
        <button
          type="button"
          onClick={() => onToggleAll(!allSelected)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded text-xs font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
        >
          {allSelected ? t("clear") : t("selectAll")}
        </button>
      </div>
      <div className="border-border flex max-h-64 flex-col gap-0.5 overflow-y-auto rounded-xl border p-2">
        {trees.map((tree) => (
          <label
            key={tree.id}
            className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
          >
            <input
              type="checkbox"
              name="treeId"
              value={tree.id}
              checked={selected.has(tree.id)}
              onChange={() => onToggle(tree.id)}
              className="size-4"
            />
            {tree.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
