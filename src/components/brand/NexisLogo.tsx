import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";

export default function NexisLogo() {
  return (
    <Link
      href="/"
      className="mx-auto block shrink-0 leading-none transition-opacity hover:opacity-90"
      aria-label="NexisAI Ana Sayfa"
    >
      <BrandLogo />
    </Link>
  );
}
