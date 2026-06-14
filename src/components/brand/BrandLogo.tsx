interface BrandLogoProps {
  className?: string;
}

export default function BrandLogo({
  className = "mx-auto block h-auto w-48 object-contain object-top -mb-8 sm:w-56 sm:-mb-10 md:w-64 md:-mb-12 lg:w-72",
}: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="NexisAI Logo"
      className={className}
    />
  );
}
