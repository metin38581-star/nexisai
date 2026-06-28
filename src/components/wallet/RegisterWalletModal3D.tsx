"use client";

import ModalPanelScene3D from "@/components/landing/ModalPanelScene3D";
import RegisterWalletPanelContent from "@/components/landing/RegisterWalletPanelContent";

interface RegisterWalletModal3DProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "register" | "wallet";
  onWalletSuccess?: () => void;
  onRegisterSuccess?: () => void;
}

export default function RegisterWalletModal3D({
  isOpen,
  onClose,
  mode,
  onWalletSuccess,
  onRegisterSuccess,
}: RegisterWalletModal3DProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg items-start justify-center overflow-y-auto overscroll-contain sm:max-h-[min(90vh,720px)] sm:items-center sm:overflow-visible">
        <ModalPanelScene3D active={isOpen} />
        <RegisterWalletPanelContent
          mode={mode}
          onClose={onClose}
          onWalletSuccess={onWalletSuccess}
          onRegisterSuccess={onRegisterSuccess}
        />
      </div>
    </div>
  );
}
