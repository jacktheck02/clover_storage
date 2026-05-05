import React from "react";
import Image from "next/image";
import { cn, getFileIcon } from "@/lib/utils";
import { useAudioArtwork } from "@/hooks/useAudioArtwork";

interface Props {
  type: string;
  extension: string;
  url?: string;
  imageClassName?: string;
  className?: string;
}

export const Thumbnail = ({
  type,
  extension,
  url = "",
  imageClassName,
  className,
}: Props) => {
  const isImage = type === "image" && extension !== "svg";
  const isAudio = type === "audio";
  const { artworkUrl } = useAudioArtwork(url, isAudio);
  const previewSrc = isImage ? url : isAudio && artworkUrl ? artworkUrl : getFileIcon(extension, type);

  return (
    <figure className={cn("thumbnail", className)}>
      <Image
        src={previewSrc}
        alt="thumbnail"
        width={100}
        height={100}
        unoptimized={Boolean(isAudio && artworkUrl)}
        className={cn(
          "size-8 object-contain",
          imageClassName,
          (isImage || (isAudio && artworkUrl)) && "thumbnail-image",
        )}
      />
    </figure>
  );
};
export default Thumbnail;