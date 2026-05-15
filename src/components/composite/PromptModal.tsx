import { useState } from "react";

interface PromptModalProps {
  title?: string;
  message?: string;
  inputType?: "text" | "password";
  inputMode?: "numeric" | "text";
  placeholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export default function PromptModal({
  title,
  message,
  inputType = "text",
  inputMode = "text",
  placeholder,
  submitLabel = "OK",
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
}: PromptModalProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) return;
    onSubmit(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-800">
        {title && (
          <h2 className="mb-2 text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
        )}
        {message && (
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
            {message}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type={inputType}
            inputMode={inputMode}
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="mb-4 w-full rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-center text-xl tracking-widest text-neutral-900 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!value}
              className="flex-1 rounded-full bg-primary p-3 font-semibold text-white disabled:opacity-50"
            >
              {submitLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-full border-2 border-neutral-300 p-3 font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-400"
            >
              {cancelLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
