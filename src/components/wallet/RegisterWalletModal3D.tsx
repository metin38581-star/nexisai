"use client";

import ModalPanelScene3D from "@/components/landing/ModalPanelScene3D";
import RegisterWalletPanelContent from "@/components/landing/RegisterWalletPanelContent";

interface RegisterWalletModal3DProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "register" | "wallet";
  onWalletSuccess?: () => void;
}

export default function RegisterWalletModal3D({
  isOpen,
  onClose,
  mode,
  onWalletSuccess,
}: RegisterWalletModal3DProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex h-[min(90vh,720px)] w-full max-w-lg items-center justify-center [perspective:900px]">
        <ModalPanelScene3D active={isOpen} />
        <RegisterWalletPanelContent
          mode={mode}
          onClose={onClose}
          onWalletSuccess={onWalletSuccess}
        />
      </div>
    </div>
  );
}
