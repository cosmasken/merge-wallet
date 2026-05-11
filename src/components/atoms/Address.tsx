interface AddressProps {
  address?: string;
  short?: boolean;
  className?: string;
}

export default function Address({
  address = "-",
  short = false,
  className,
}: AddressProps) {
  const prefix = address.slice(0, 6);
  const suffix = address.slice(-4);

  return (
    <span className={`font-mono ${className ?? ""}`}>
      {short ? (
        <>{prefix}&hellip;{suffix}</>
      ) : (
        <>{prefix}{address.slice(6, -4)}{suffix}</>
      )}
    </span>
  );
}
