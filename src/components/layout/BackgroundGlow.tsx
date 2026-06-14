export default function BackgroundGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="glow-orb -left-32 top-0 h-[500px] w-[500px] bg-violet-600/20 animate-glow-pulse" />
      <div className="glow-orb -right-32 top-1/4 h-[600px] w-[600px] bg-blue-600/15 animate-glow-pulse [animation-delay:1.5s]" />
      <div className="glow-orb bottom-0 left-1/3 h-[400px] w-[400px] bg-purple-500/10 animate-glow-pulse [animation-delay:3s]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
    </div>
  );
}
