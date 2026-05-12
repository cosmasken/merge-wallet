import { ReactNode } from "react";

interface ErrorStateProps {
    title: string;
    message: string;
    icon?: ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export default function ErrorState({ title, message, icon, action }: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center gap-4 px-4 pt-16 text-center">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                {icon || (
                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-error" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    </svg>
                )}
            </div>
            <div>
                <p className="text-neutral-800 dark:text-neutral-100 font-medium">{title}</p>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs">{message}</p>
            </div>
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium active:bg-primary/90"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}