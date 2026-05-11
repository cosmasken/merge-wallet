interface ViewHeaderProps {
  title: string;
  subtitle?: string;
}

export default function ViewHeader({ title, subtitle }: ViewHeaderProps) {
  return (
    <div className="px-4 py-3">
      <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
