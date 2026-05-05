"use client";

import { useEffect, useState } from "react";

const artworkCache = new Map<string, string | null>();

const bytesToBase64 = (bytes: number[]) => {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

export const useAudioArtwork = (url: string, enabled = true) => {
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !url) {
      setArtworkUrl(null);
      return;
    }

    if (artworkCache.has(url)) {
      setArtworkUrl(artworkCache.get(url) ?? null);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    const loadArtwork = async () => {
      try {
        // Use browser bundle to avoid pulling React Native readers into Next SSR.
        const jsmediatagsModule = await import("jsmediatags/dist/jsmediatags.min.js");
        const jsmediatags =
          (jsmediatagsModule as { default?: { read: Function } }).default ||
          (jsmediatagsModule as { read: Function });
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) {
          artworkCache.set(url, null);
          if (mounted) setArtworkUrl(null);
          return;
        }
        const audioBlob = await response.blob();

        await new Promise<void>((resolve) => {
          jsmediatags.read(audioBlob, {
            onSuccess: (tag: {
              tags?: { picture?: { data: number[]; format?: string } };
            }) => {
              const picture = tag.tags?.picture;
              if (!picture?.data?.length) {
                artworkCache.set(url, null);
                if (mounted) setArtworkUrl(null);
                resolve();
                return;
              }

              const base64Data = bytesToBase64(picture.data);
              const mimeType = picture.format || "image/jpeg";
              const dataUrl = `data:${mimeType};base64,${base64Data}`;

              artworkCache.set(url, dataUrl);
              if (mounted) setArtworkUrl(dataUrl);
              resolve();
            },
            onError: () => {
              artworkCache.set(url, null);
              if (mounted) setArtworkUrl(null);
              resolve();
            },
          });
        });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadArtwork();

    return () => {
      mounted = false;
    };
  }, [enabled, url]);

  return { artworkUrl, isLoading };
};

