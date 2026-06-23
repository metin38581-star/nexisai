"use client";

import { useState, type ReactNode } from "react";

interface CyberScanFieldProps {
  label: string;
  children: ReactNode;
}

export default function CyberScanField({ label, children }: CyberScanFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={`dc-scan-field ${focused ? "dc-scan-field--active" : ""}`}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setFocused(false);
        }
      }}
    >
      <label className="mb-2 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <div className="dc-scan-field-inner">{children}</div>
    </div>
  );
}
