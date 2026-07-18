"use client";

import React from "react";
import { X, Trash2 } from "lucide-react";

interface ProfilePhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatar: string;
  name: string;
  /** Remove the current photo. The parent handles persistence, then closes. */
  onDelete: () => void;
}

/**
 * A simple full-screen viewer for the user's profile photo, with a single
 * Delete action — no editing, framing, or visibility controls.
 */
export default function ProfilePhotoViewerModal({
  isOpen,
  onClose,
  avatar,
  name,
  onDelete,
}: ProfilePhotoViewerModalProps) {
  if (!isOpen) return null;

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="text-lg font-bold text-white">Profile photo</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-72 h-72 max-w-[80vw] max-h-[80vw] rounded-full overflow-hidden shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Actions — only Delete */}
      <div className="flex justify-end px-8 py-6">
        <button
          onClick={handleDelete}
          className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          <Trash2 className="w-6 h-6" />
          <span className="text-sm font-medium">Delete</span>
        </button>
      </div>
    </div>
  );
}
