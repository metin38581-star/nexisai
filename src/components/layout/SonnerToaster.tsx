"use client";

import { Toaster } from "sonner";

export default function SonnerToaster() {
  return (
    <Toaster
      theme="dark"
      richColors
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "border border-violet-500/20 bg-zinc-950/95 text-white shadow-[0_0_24px_rgba(139,92,246,0.2)]",
        },
      }}
    />
  );
}
