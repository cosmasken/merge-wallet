import { ReactNode, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import ToastCard from "@/atoms/ToastCard";

interface ToastEntry {
  id: string;
  content: (onDismiss: () => void) => ReactNode;
  duration: number;
}

interface ToastState extends ToastEntry {
  isDismissing: boolean;
}

let pushToast: ((entry: ToastEntry) => void) | null = null;
let dismissToast: ((id: string) => void) | null = null;

let nextId = 0;
function generateId(): string {
  nextId += 1;
  return `toast-${nextId}`;
}

export default function NotificationService() {
  return {
    success,
    error,
    info,
    NotificationProvider,
  };

  function success(message: string, duration = 3000) {
    push({
      id: generateId(),
      duration,
      content: (onDismiss) => (
        <ToastCard
          icon={<CheckIcon />}
          message={message}
          variant="success"
          onDismiss={onDismiss}
        />
      ),
    });
  }

  function error(message: string, duration = 4000) {
    push({
      id: generateId(),
      duration,
      content: (onDismiss) => (
        <ToastCard
          icon={<XIcon />}
          message={message}
          variant="error"
          onDismiss={onDismiss}
        />
      ),
    });
  }

  function info(message: string, duration = 3000) {
    push({
      id: generateId(),
      duration,
      content: (onDismiss) => (
        <ToastCard
          icon={<InfoIcon />}
          message={message}
          variant="info"
          onDismiss={onDismiss}
        />
      ),
    });
  }
}

function push(entry: ToastEntry) {
  if (pushToast) {
    pushToast(entry);
  }
}

function dismiss(id: string) {
  if (dismissToast) {
    dismissToast(id);
  }
}

function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    pushToast = (entry: ToastEntry) => {
      setToasts(prev => [...prev, { ...entry, isDismissing: false }]);
    };

    dismissToast = (id: string) => {
      setToasts(prev => prev.map(t => 
        t.id === id ? { ...t, isDismissing: true } : t
      ));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    };

    return () => {
      pushToast = null;
      dismissToast = null;
    };
  }, []);

  const handleDismiss = useCallback((id: string) => {
    dismiss(id);
  }, []);

  useEffect(() => {
    toasts.forEach(toast => {
      if (toast.duration !== Infinity && !toast.isDismissing) {
        const timer = setTimeout(() => {
          handleDismiss(toast.id);
        }, toast.duration);
        return () => clearTimeout(timer);
      }
    });
  }, [toasts, handleDismiss]);

  return (
    <>
      {children}
      {createPortal(
        <div className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`pointer-events-auto transition-opacity duration-300 ${
                toast.isDismissing ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {toast.content(() => handleDismiss(toast.id))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export { NotificationProvider };
