interface IconProps { className?: string; }

export default function AssetsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M6 12h12" />
      <path d="M12 6a6 6 0 0 0 0 12" />
    </svg>
  );
}
