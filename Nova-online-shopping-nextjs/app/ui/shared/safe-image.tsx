import Image, { type ImageProps } from "next/image";
import type { CSSProperties } from "react";

const NEXT_IMAGE_HOST_PATTERNS = [
  /^res\.cloudinary\.com$/i,
  /\.googleusercontent\.com$/i,
];

/** Hosts allowed in next.config `images.remotePatterns` - use next/image for these only. */
export function canOptimizeImageWithNext(src: string): boolean {
  if (src.startsWith("/")) return true;

  try {
    const { hostname } = new URL(src);
    return NEXT_IMAGE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

type SafeImageProps = ImageProps;

function FallbackImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  style,
  priority,
  fetchPriority,
}: Readonly<SafeImageProps>) {
  let imgStyle: CSSProperties = {
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
    ...(typeof style === "object" ? style : {}),
  };
  if (fill) {
    imgStyle = {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "contain",
      ...(typeof style === "object" ? style : {}),
    };
  }

  return (
    // External product URLs (e.g. vendor CDNs) bypass next/image hostname allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src : ""}
      alt={alt}
      className={className}
      style={imgStyle}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={fetchPriority}
    />
  );
}

export function SafeImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  style,
  sizes,
  priority,
  fetchPriority,
  ...rest
}: SafeImageProps) {
  const srcStr = typeof src === "string" ? src : "";

  if (!canOptimizeImageWithNext(srcStr)) {
    return <FallbackImage {...{ src, alt, fill, width, height, className, style, priority, fetchPriority }} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      style={style}
      sizes={sizes}
      priority={priority}
      fetchPriority={fetchPriority}
      {...rest}
    />
  );
}
