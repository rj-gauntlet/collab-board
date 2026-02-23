"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Copy, Check, Mail } from "lucide-react";

interface ShareModalProps {
  boardLink: string;
  onClose: () => void;
}

export function ShareModal({
  boardLink,
  onClose,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(boardLink).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {}
    );
  }, [boardLink]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="bg-white w-full max-w-md mx-4 max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border border-[#ffe0b2]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#fff3e0]">
          <h2 id="share-modal-title" className="text-base font-semibold text-[#5d4037]">
            Share
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#8d6e63] hover:bg-[#fff3e0] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8d6e63] block mb-2">
              Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={boardLink}
                className="flex-1 min-w-0 rounded-lg border border-[#ffe0b2] bg-[#fff8e1]/50 px-3 py-2 text-sm text-[#3e2723]"
                aria-label="Board link"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 shrink-0 rounded-lg border border-[#ffe0b2] bg-[#fff8e1] px-3 py-2 text-sm font-medium text-[#5d4037] transition hover:bg-[#ffe0b2]/50"
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8d6e63] mb-2">
              Invite
            </h3>
            <p className="text-sm text-[#5d4037] mb-3">
              Share the link above, or open your email client to send an invite.
            </p>
            <a
              href={
                boardLink
                  ? `mailto:?subject=${encodeURIComponent("Invitation to collaborate on CollabBoard")}&body=${encodeURIComponent(`Join me on this board:\n\n${boardLink}`)}`
                  : "#"
              }
              className="inline-flex items-center gap-2 rounded-lg border border-[#ffe0b2] bg-[#fff8e1] px-3 py-2 text-sm font-medium text-[#5d4037] transition hover:bg-[#ffe0b2]/50"
              onClick={(e) => !boardLink && e.preventDefault()}
            >
              <Mail size={16} />
              Open in email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
