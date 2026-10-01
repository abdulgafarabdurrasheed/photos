import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveMediaDate } from "@/lib/media/exif";
import { prefetchImage } from "@/lib/media/prefetch";
import type { Event, MediaItem } from "@/types/media";

function getMediaProxyUrl(
  mediaId: string,
  variant: "original" | "thumbnail" = "original",
) {
  if (variant === "thumbnail") return `/media/${mediaId}/thumbnail`;
  return `/media/${mediaId}`;
}

function isImageMedia(item: MediaItem) {
  return item.mimeType.startsWith("image/");
}

function getThumbnailProxyUrl(item: MediaItem) {
  if (item.thumbnailUrl) return item.thumbnailUrl;
  return item.thumbnailS3Key || isImageMedia(item)
    ? getMediaProxyUrl(item.id, "thumbnail")
    : null;
}

function getFullSizeProxyUrl(item: MediaItem) {
  return getMediaProxyUrl(item.id, "original");
}

function getDisplayProxyUrl(item: MediaItem) {
  if (!isImageMedia(item)) return getFullSizeProxyUrl(item);
  return item.displayUrl ?? getFullSizeProxyUrl(item);
}

function shouldReduceMediaPrefetch() {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
  };
  return Boolean(
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 3) ||
      (navigator.hardwareConcurrency || 4) <= 4,
  );
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}

const DATE_LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

export function useMediaGalleryData(
  media: MediaItem[],
  events: Event[],
  initialPhotoId?: string,
) {
  const [localMedia, setLocalMedia] = useState<MediaItem[]>(media);
  const [filter, setFilter] = useState<"all" | "photos" | "videos">("all");
  const [sortBy, setSortBy] = useState<
    "date" | "uploader" | "event" | "likes" | "random"
  >("date");
  const [dateOrder, setDateOrder] = useState<"desc" | "asc">("desc");
  const [randomSeed, setRandomSeed] = useState(Math.random());
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [fullSizeUrl, setFullSizeUrl] = useState<string | null>(null);
  const fullSizeUrlCacheRef = useRef<Record<string, string>>({});
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    setLocalMedia((prev) => {
      const serverIds = new Set(media.map((m) => m.id));
      const liveOnly = prev.filter((m) => !serverIds.has(m.id));
      return liveOnly.length > 0 ? [...liveOnly, ...media] : media;
    });
  }, [media]);
  const eventMap = useMemo(() => {
    const map = new Map<string, Event>();
    events.forEach((event) => {
      map.set(event.id, event);
    });
    return map;
  }, [events]);
  const { sortKeys, dateLabels } = useMemo(() => {
    const keys = new Map<
      string,
      {
        date: number;
        uploader: string;
        likes: number;
        hash: number;
        eventName: string;
      }
    >();
    const labels = new Map<string, string>();
    for (const item of localMedia) {
      const event =
        item.event || (item.eventId ? eventMap.get(item.eventId) : null);
      const date = resolveMediaDate(item.exifData, item.uploadedAt);
      keys.set(item.id, {
        date: date.getTime(),
        uploader: item.uploadedBy?.name || "",
        likes: item.likeCount || 0,
        hash: hashString(item.id + randomSeed),
        eventName: event?.name || "",
      });
      labels.set(item.id, date.toLocaleDateString("en-US", DATE_LABEL_OPTIONS));
    }
    return { sortKeys: keys, dateLabels: labels };
  }, [localMedia, randomSeed, eventMap]);
  const sortedMedia = useMemo(() => {
    const filteredMedia = localMedia.filter((item) => {
      if (filter === "photos" && !item.mimeType.startsWith("image/"))
        return false;
      if (filter === "videos" && !item.mimeType.startsWith("video/"))
        return false;
      return true;
    });
    return [...filteredMedia].sort((a, b) => {
      const aKey = sortKeys.get(a.id);
      const bKey = sortKeys.get(b.id);
      if (!aKey || !bKey) return 0;
      if (sortBy === "date") {
        const diff = bKey.date - aKey.date;
        return dateOrder === "desc" ? diff : -diff;
      }
      if (sortBy === "uploader") {
        return aKey.uploader.localeCompare(bKey.uploader);
      }
      if (sortBy === "likes") {
        return bKey.likes - aKey.likes;
      }
      if (sortBy === "random") {
        return aKey.hash - bKey.hash;
      }
      return aKey.eventName.localeCompare(bKey.eventName);
    });
  }, [localMedia, filter, sortBy, dateOrder, sortKeys]);
  useEffect(() => {
    if (initialPhotoId) {
      const photo = localMedia.find((m) => m.id === initialPhotoId);
      if (photo) setSelectedMedia(photo);
    }
  }, [initialPhotoId, localMedia]);
  const updateUrl = (mediaId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (mediaId) {
      params.set("photo", mediaId);
    } else {
      params.delete("photo");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const selectedThumbnailUrl = selectedMedia
    ? getThumbnailProxyUrl(selectedMedia)
    : null;
  const selectedDisplayUrl = selectedMedia
    ? getDisplayProxyUrl(selectedMedia)
    : null;
  const selectedDisplayAvifUrl =
    selectedMedia && isImageMedia(selectedMedia)
      ? (selectedMedia.displayAvifUrl ?? null)
      : null;

  const refreshFullSizeUrl = useCallback(
    (mediaToLoad?: MediaItem | null) => {
      const target = mediaToLoad ?? selectedMedia;
      if (!target) {
        setFullSizeUrl(null);
        return;
      }
      const cachedUrl = fullSizeUrlCacheRef.current[target.id];
      if (cachedUrl) {
        setFullSizeUrl(cachedUrl);
        return;
      }
      const url = getFullSizeProxyUrl(target);
      fullSizeUrlCacheRef.current[target.id] = url;
      setFullSizeUrl(url);
    },
    [selectedMedia],
  );

  const prefetchFullSizeUrls = useCallback((items: MediaItem[]) => {
    if (shouldReduceMediaPrefetch()) return;
    for (const item of items) {
      if (!isImageMedia(item)) continue;
      prefetchImage(item.displayAvifUrl ?? getDisplayProxyUrl(item));
    }
  }, []);

  useEffect(() => {
    refreshFullSizeUrl(selectedMedia);
  }, [selectedMedia, refreshFullSizeUrl]);

  return {
    localMedia,
    setLocalMedia,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    dateOrder,
    setDateOrder,
    randomSeed,
    setRandomSeed,
    selectedMedia,
    setSelectedMedia,
    selectedThumbnailUrl,
    selectedDisplayUrl,
    selectedDisplayAvifUrl,
    fullSizeUrl,
    setFullSizeUrl,
    refreshFullSizeUrl,
    prefetchFullSizeUrls,
    sortedMedia,
    dateLabels,
    eventMap,
    updateUrl,
  };
}
