import { useNavigate } from "react-router-dom";

interface ViewHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export default function ViewHeader({ title, subtitle, showBack }: ViewHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700 shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-600 dark:text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
