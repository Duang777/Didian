import { useState, useEffect } from "react";
import { cn } from "../../lib/utils";

interface DidianIconProps extends React.ComponentProps<"span"> {
  /**
   * If true, play a one-time entrance spin animation.
   */
  animate?: boolean;
  /**
   * If true, disable hover spin animation.
   */
  noSpin?: boolean;
  /**
   * If true, show a border around the icon.
   */
  bordered?: boolean;
  /**
   * Size of the bordered icon: "sm" (default), "md", "lg"
   */
  size?: "sm" | "md" | "lg";
}

const borderedSizes = {
  sm: { wrapper: "p-1.5", icon: "size-3.5" },
  md: { wrapper: "p-2", icon: "size-4" },
  lg: { wrapper: "p-2.5", icon: "size-5" },
};

const DIDIAN_PATH =
  "M51 8c5 0 9 4 9 9v46c0 5-4 9-9 9H35C18.5 72 7 59 7 40S18.5 8 35 8h16Zm-16 17c-8.2 0-13.5 6-13.5 15S26.8 55 35 55h10V25H35Z";

function DidianMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      aria-hidden="true"
      className={cn("block size-full", className)}
      fill="currentColor"
    >
      <path d={DIDIAN_PATH} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

/** Single-color Didian mark. Uses currentColor for light/dark themes. */
export function DidianIcon({
  className,
  animate = false,
  noSpin = false,
  bordered = false,
  size = "sm",
  ...props
}: DidianIconProps) {
  const [entranceDone, setEntranceDone] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => setEntranceDone(true), 600);
    return () => clearTimeout(timer);
  }, [animate]);

  if (bordered) {
    const sizeConfig = borderedSizes[size];
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center border border-border rounded-md",
          sizeConfig.wrapper,
          className
        )}
        aria-hidden="true"
        {...props}
      >
        <span
          className={cn(
            "block",
            sizeConfig.icon,
            !entranceDone && "animate-entrance-spin",
            entranceDone && !noSpin && "hover:animate-spin"
          )}
        >
          <DidianMark />
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-block size-[1em]",
        !entranceDone && "animate-entrance-spin",
        entranceDone && !noSpin && "hover:animate-spin",
        className
      )}
      aria-hidden="true"
      {...props}
    >
      <DidianMark />
    </span>
  );
}
