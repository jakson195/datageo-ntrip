import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  size?: "header" | "sm" | "md" | "lg";
  showWordmark?: boolean;
  variant?: "dark" | "light";
  className?: string;
};

const sizes = {
  header: {
    iconClass: "h-12 w-auto sm:h-14 lg:h-[4.25rem]",
    iconHeight: 68,
    iconWidth: 54,
    textClass: "text-xl font-semibold sm:text-2xl lg:text-[1.85rem] lg:leading-none",
  },
  sm: {
    iconClass: "h-11 w-auto",
    iconHeight: 44,
    iconWidth: 35,
    textClass: "text-lg font-semibold",
  },
  md: {
    iconClass: "h-12 w-auto sm:h-14",
    iconHeight: 56,
    iconWidth: 45,
    textClass: "text-xl font-semibold sm:text-2xl",
  },
  lg: {
    iconClass: "h-14 w-auto sm:h-16",
    iconHeight: 64,
    iconWidth: 51,
    textClass: "text-2xl font-semibold sm:text-3xl",
  },
} as const;

function Wordmark({ className, variant }: { className: string; variant: "dark" | "light" }) {
  const base =
    variant === "light"
      ? "brand-wordmark brand-wordmark-on-light"
      : "brand-wordmark brand-wordmark-on-dark";

  return (
    <span className={`${base} ${className}`}>
      <span className="brand-data">Data</span>
      <span className="brand-geo">Geo</span>
      <span className="brand-ntrip">NTrip</span>
    </span>
  );
}

function BrandIcon({ className, height, width }: { className: string; height: number; width: number }) {
  return (
    <Image
      src="/brand/datageo-ntrip-icon.svg"
      alt=""
      width={width}
      height={height}
      className={`max-w-none shrink-0 object-contain object-left ${className}`}
      aria-hidden
    />
  );
}

export function BrandLogo({
  href = "/",
  size = "md",
  showWordmark = true,
  variant = "dark",
  className = "",
}: BrandLogoProps) {
  const preset = sizes[size];

  const content = showWordmark ? (
    <>
      <BrandIcon
        className={preset.iconClass}
        height={preset.iconHeight}
        width={preset.iconWidth}
      />
      <Wordmark className={`whitespace-nowrap ${preset.textClass}`} variant={variant} />
    </>
  ) : (
    <BrandIcon className={preset.iconClass} height={preset.iconHeight} width={preset.iconWidth} />
  );

  const baseClass = `inline-flex items-center gap-2.5 sm:gap-3 ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseClass} transition opacity-95 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-geo/50`}
      >
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
