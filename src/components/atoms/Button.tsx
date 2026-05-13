interface ButtonProps {
  label?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: React.MouseEventHandler;
  disabled?: boolean;
  fullWidth?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  size?: "sm" | "md" | "lg"; // added size prop as used in components
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
  children,
  icon: Icon,
  onClick = () => null,
  disabled = false,
  fullWidth = false,
  variant = "primary",
  className = "",
  size = "md",
}: ButtonProps) {
  const sizeClass = size === "sm" ? "p-2 text-sm" : size === "lg" ? "p-4 text-lg" : "p-3";

  return (
    <div className={`${fullWidth ? "w-full" : ""} ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        className={`
          flex items-center justify-center gap-2 mx-auto
          border-2 rounded-full shadow-md
          ${fullWidth ? "w-full" : ""}
          ${sizeClass}
          ${variantStyles[variant]}
          ${disabled ? "opacity-50 shadow-none cursor-default" : "cursor-pointer active:shadow-none"}
        `}
        disabled={disabled}
      >
        {Icon && <Icon className="w-5 h-5" />}
        {children || label}
      </button>
    </div>
  );
}

