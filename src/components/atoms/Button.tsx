interface ButtonProps {
  label?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: React.MouseEventHandler;
  disabled?: boolean;
  fullWidth?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}

const variantStyles = {
  primary:
    "bg-primary border-primary text-white active:bg-primary-700",
  secondary:
    "bg-white dark:bg-neutral-1000 border-primary dark:border-primarydark text-neutral-600 dark:text-neutral-50/85 active:bg-primary active:text-white",
  ghost:
    "bg-transparent border-transparent text-primary active:bg-primary-50 dark:active:bg-primarydark-100",
};

export default function Button({
  label = "",
  icon: Icon,
  onClick = () => null,
  disabled = false,
  fullWidth = false,
  variant = "primary",
  className = "",
}: ButtonProps) {
  return (
    <div className={`${fullWidth ? "w-full" : ""} ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        className={`
          flex items-center justify-center gap-2 p-3 mx-auto
          border-2 rounded-full shadow-md
          ${fullWidth ? "w-full" : ""}
          ${variantStyles[variant]}
          ${disabled ? "opacity-50 shadow-none cursor-default" : "cursor-pointer active:shadow-none"}
        `}
        disabled={disabled}
      >
        {Icon && <Icon className="text-2xl" />}
        {label}
      </button>
    </div>
  );
}
