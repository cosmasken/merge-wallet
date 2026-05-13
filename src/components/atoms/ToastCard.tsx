import { ReactNode } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastCardProps {
  icon: ReactNode;
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
}

const variantStyles = {
  success: "border-green-500 bg-green-50 dark:bg-green-900/20",
  error: "border-red-500 bg-red-50 dark:bg-red-900/20", 
  info: "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
};

export default function ToastCard({
  icon,
  message,
  variant = "info",
  onDismiss,
}: ToastCardProps) {
  return (
    <div
      className={`w-full shadow-lg rounded-lg flex border-2 p-3 cursor-pointer animate-in slide-in-from-top-2 duration-300 ${variantStyles[variant]}`}
      onClick={onDismiss}
    >
      <div className="flex items-center justify-center mr-3">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {message}
        </div>
      </div>
    </div>
  );
}
