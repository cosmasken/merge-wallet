import { useCallback, useEffect, useState } from "react";

import PromptModal from "@/composite/PromptModal";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PromptOptions {
  title?: string;
  message?: string;
  inputType?: "text" | "password";
  inputMode?: "numeric" | "text";
  placeholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
}

type ModalEntry =
  | { type: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { type: "prompt"; options: PromptOptions; resolve: (v: string | null) => void };

let pushModal: ((entry: ModalEntry) => void) | null = null;

export default function ModalService() {
  return {
    showConfirm(options: ConfirmOptions): Promise<boolean> {
      if (!pushModal) throw new Error("ModalProvider not mounted");
      return new Promise((resolve) => {
        pushModal!({ type: "confirm", options, resolve });
      });
    },

    showPrompt(options: PromptOptions): Promise<string | null> {
      if (!pushModal) throw new Error("ModalProvider not mounted");
      return new Promise((resolve) => {
        pushModal!({ type: "prompt", options, resolve });
      });
    },
  };
}

function ConfirmModal({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-800">
        <p className="mb-6 text-center text-neutral-800 dark:text-neutral-200">
          {options.message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full bg-primary p-3 font-semibold text-white"
          >
            {options.confirmLabel ?? "OK"}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border-2 border-neutral-300 p-3 font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-400"
          >
            {options.cancelLabel ?? "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalProvider() {
  const [modals, setModals] = useState<ModalEntry[]>([]);

  const push = useCallback(function push(entry: ModalEntry) {
    setModals((prev) => [...prev, entry]);
  }, []);

  const dismiss = useCallback(function dismiss() {
    setModals((prev) => prev.slice(1));
  }, []);

  useEffect(function registerPush() {
    pushModal = push;
    return () => {
      pushModal = null;
    };
  }, [push]);

  const current = modals.length > 0 ? modals[0] : null;

  if (!current) return null;

  switch (current.type) {
    case "confirm":
      return (
        <ConfirmModal
          options={current.options}
          onConfirm={() => {
            dismiss();
            current.resolve(true);
          }}
          onCancel={() => {
            dismiss();
            current.resolve(false);
          }}
        />
      );

    case "prompt":
      return (
        <PromptModal
          {...current.options}
          onSubmit={(value) => {
            dismiss();
            current.resolve(value);
          }}
          onCancel={() => {
            dismiss();
            current.resolve(null);
          }}
        />
      );

    default:
      return null;
  }
}
