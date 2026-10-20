import { useCallback, useEffect, useRef, useState } from "react";

// An in-page confirmation (instead of the browser's confirm box), with buttons that say what
// they do. Cancel is focused first, so pressing Enter by accident never deletes anything.
//
//   const [confirmDialog, confirm] = useConfirm();
//   if (!(await confirm({ title: "Delete this recipe?", confirmLabel: "Delete recipe" }))) return;
//   ...
//   return <>{confirmDialog} ...</>;
export function useConfirm() {
  const dialog = useRef(null);
  const resolver = useRef(null);
  const [options, setOptions] = useState(null);

  const confirm = useCallback((next) => {
    setOptions(next);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  // Open once React has rendered the new text
  useEffect(() => {
    if (options && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [options]);

  function close(result) {
    dialog.current?.close();
    resolver.current?.(result);
    resolver.current = null;
  }

  const element = (
    <dialog
      ref={dialog}
      // Escape and clicks outside count as Cancel
      onCancel={(e) => {
        e.preventDefault();
        close(false);
      }}
      onClick={(e) => e.target === dialog.current && close(false)}
      aria-labelledby="confirm-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/40"
    >
      {options && (
        <div className="p-6">
          <h2 id="confirm-title" className="text-xl font-semibold">
            {options.title}
          </h2>
          {options.message && <p className="mt-2 text-sm text-muted-foreground">{options.message}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              autoFocus
              onClick={() => close(false)}
              className="h-11 rounded-full border px-5 text-sm font-medium transition hover:bg-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => close(true)}
              className={`h-11 rounded-full px-5 text-sm font-medium transition cursor-pointer ${
                options.destructive === false
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }`}
            >
              {options.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );

  return [element, confirm];
}
