"use client";

import { useEffect, useSyncExternalStore } from "react";

type ArtworkState = {
  artworkUrl: string | null;
  isLoading: boolean;
};

const emptyArtworkState: ArtworkState = { artworkUrl: null, isLoading: false };
const artworkCache = new Map<string, ArtworkState>();
const artworkListeners = new Set<() => void>();

const bytesToBase64 = (bytes: number[]) => {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const emitArtworkChange = () => {
  artworkListeners.forEach((listener) => listener());
};

const subscribeToArtwork = (listener: () => void) => {
  artworkListeners.add(listener);
  return () => artworkListeners.delete(listener);
};

const setArtworkState = (url: string, state: ArtworkState) => {
  artworkCache.set(url, state);
  emitArtworkChange();
};

const getArtworkState = (url: string, enabled: boolean) => {
  if (!enabled || !url) return emptyArtworkState;
  return artworkCache.get(url) || emptyArtworkState;
};

const loadArtwork = async (url: string) => {
  const current = artworkCache.get(url);
  if (current && !current.isLoading) return;
  if (current?.isLoading) return;

  setArtworkState(url, { artworkUrl: null, isLoading: true });

  try {
    // Use browser bundle to avoid pulling React Native readers into Next SSR.
    const jsmediatagsModule = await import("jsmediatags/dist/jsmediatags.min.js");
    const jsmediatags =
      (jsmediatagsModule as { default?: { read: Function } }).default ||
      (jsmediatagsModule as { read: Function });
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      setArtworkState(url, emptyArtworkState);
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
            setArtworkState(url, emptyArtworkState);
            resolve();
            return;
          }

          const base64Data = bytesToBase64(picture.data);
          const mimeType = picture.format || "image/jpeg";
          const dataUrl = `data:${mimeType};base64,${base64Data}`;

          setArtworkState(url, { artworkUrl: dataUrl, isLoading: false });
          resolve();
        },
        onError: () => {
          setArtworkState(url, emptyArtworkState);
          resolve();
        },
      });
    });
  } catch {
    setArtworkState(url, emptyArtworkState);
  }
};

export const useAudioArtwork = (url: string, enabled = true) => {
  const artworkState = useSyncExternalStore(
    subscribeToArtwork,
    () => getArtworkState(url, enabled),
    () => emptyArtworkState
  );

  useEffect(() => {
    if (enabled && url) void loadArtwork(url);
  }, [enabled, url]);

  return artworkState;
};
