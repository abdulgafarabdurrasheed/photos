const prefetchedImages = new Map<string, HTMLImageElement>();

export function prefetchImage(url: string | null | undefined) {
  if (!url || prefetchedImages.has(url)) return;
  const image = new Image();
  image.decoding = "async";
  const cleanup = () => prefetchedImages.delete(url);
  image.onload = cleanup;
  image.onerror = cleanup;
  prefetchedImages.set(url, image);
  image.src = url;
}
