import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";

export default function NexisLogo() {
  return (
    <Link
      href="/"
      className="mx-auto block shrink-0 leading-none transition-opacity hover:opacity-90"
      aria-label="NexisAI Ana Sayfa"
    >
      <BrandLogo className="mx-auto block h-auto w-48 object-contain object-top -mt-3 -mb-8 sm:w-56 sm:-mt-4 sm:-mb-10 md:w-64 md:-mb-12 lg:w-72" />
    </Link>
  );
}
