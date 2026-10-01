"use client";

import { memo, type ReactNode } from "react";
import { HiCheck } from "react-icons/hi2";
import { prefetchImage } from "@/lib/media/prefetch";
import type { MediaItem } from "@/types/media";
import GalleryImage from "./GalleryImage";
import OnDemandVideoThumb from "./OnDemandVideoThumb";
import VideoIndicator from "./VideoIndicator";

interface GalleryCellProps {
  item: MediaItem;
  selected: boolean;
  selectionMode: boolean;
  optimize: boolean;
  sizes?: string;
  priority?: boolean;
  highlight?: boolean;
  draftSelected?: boolean;
  badges?: ReactNode;
  viewTransitionName?: string;
  onOpen: (item: MediaItem) => void;
  onToggleSelect: (mediaId: string) => void;
}

function GalleryCell({
  item,
  selected,
  selectionMode,
  optimize,
  sizes,
  priority = false,
  highlight = false,
  draftSelected = false,
  badges,
  viewTransitionName,
  onOpen,
  onToggleSelect,
}: GalleryCellProps) {
  const isVideo = item.mimeType.startsWith("video/");
  const isImage = item.mimeType.startsWith("image/");
  const needsVideoThumb = isVideo && !item.thumbnailUrl && !item.thumbnailS3Key;
  const thumbnailSrc =
    item.thumbnailUrl ??
    (needsVideoThumb ? null : `/media/${item.id}/thumbnail`);
  return (
    <div
      onPointerEnter={() => {
        if (isImage) prefetchImage(item.displayAvifUrl ?? item.displayUrl);
      }}
      onFocus={() => {
        if (isImage) prefetchImage(item.displayAvifUrl ?? item.displayUrl);
      }}
      className={`group relative aspect-square overflow-hidden rounded-xl border bg-zinc-800 transition-all duration-300 hover:shadow-xl md:hover:scale-[1.02] ${
        highlight
          ? "border-zinc-500 hover:border-zinc-400"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <button
        type="button"
        className="h-full w-full touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
        onClick={() => {
          if (selectionMode) {
            onToggleSelect(item.id);
          } else {
            onOpen(item);
          }
        }}
        aria-label={`View ${item.filename}`}
      >
        <GalleryImage
          src={thumbnailSrc}
          alt={item.filename}
          optimize={optimize}
          sizes={sizes}
          priority={priority}
          viewTransitionName={viewTransitionName}
        />

        {needsVideoThumb && (
          <OnDemandVideoThumb
            mediaId={item.id}
            className="absolute inset-0 h-full w-full"
          />
        )}

        {isVideo && <VideoIndicator size="lg" />}

        {badges}
      </button>

      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect(item.id);
            }}
            className={`w-8 h-8 rounded-lg backdrop-blur-sm border-2 flex items-center justify-center transition-all hover:bg-zinc-800 ${
              selected
                ? "bg-red-600 border-red-600"
                : "bg-zinc-900/80 border-white"
            }`}
          >
            {selected && <HiCheck className="w-5 h-5 text-white" />}
          </button>
        </div>
      )}
      {item.suggestedMention ? (
        <div className="absolute inset-x-2 top-2 z-20 flex items-center justify-between gap-2">
          <span className="rounded-full bg-black/75 px-2 py-1 text-[11px] font-medium text-white">
            Is this you?
          </span>
        </div>
      ) : null}
      {draftSelected && (
        <div className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-lg">
          Selected
        </div>
      )}
    </div>
  );
}

export default memo(GalleryCell);
