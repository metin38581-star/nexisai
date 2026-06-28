import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";

const LOGO_SIZE_CLASS = {
  default:
    "mx-auto block h-auto w-48 object-contain object-top -mt-3 -mb-8 sm:w-56 sm:-mt-4 sm:-mb-10 md:w-64 md:-mb-12 lg:w-72",
  compact:
    "mx-auto block h-auto w-28 object-contain object-top -mt-1 -mb-4 sm:w-32 sm:-mb-5 md:w-36 md:-mb-6",
} as const;

interface NexisLogoProps {
  size?: keyof typeof LOGO_SIZE_CLASS;
}

export default function NexisLogo({ size = "default" }: NexisLogoProps) {
  return (
    <Link
      href="/"
      className="mx-auto block shrink-0 leading-none transition-opacity hover:opacity-90"
      aria-label="NexisAI Ana Sayfa"
    >
      <BrandLogo className={LOGO_SIZE_CLASS[size]} />
    </Link>
  );
}
