interface MergeLogoProps {
  className?: string;
}

export default function MergeLogo({ className }: MergeLogoProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <circle cx="20" cy="20" r="18" stroke="#FF8C00" strokeWidth="3" />
      <path
        d="M13 20 L27 20 M20 13 L20 27"
        stroke="#FF8C00"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="4" fill="#FF8C00" />
    </svg>
  );
}
