import Image from "next/image";

type ScreenshotProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  priority?: boolean;
};

export function Screenshot({
  src,
  alt,
  width,
  height,
  caption,
  priority = false,
}: ScreenshotProps) {
  return (
    <figure className="my-10 -mx-4 sm:mx-0">
      <div className="overflow-hidden rounded-[8px] border border-white/12 bg-white/[0.035] shadow-[0_18px_70px_rgba(0,0,0,0.3)]">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 720px) 100vw, 720px"
          quality={85}
          priority={priority}
          className="block h-auto w-full"
        />
      </div>
      {caption ? (
        <figcaption className="mt-3 text-center text-[13px] text-white/44">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
