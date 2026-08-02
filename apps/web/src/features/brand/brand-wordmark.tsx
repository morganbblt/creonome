import type { ComponentProps } from "react";

type BrandWordmarkProps = Omit<
  ComponentProps<"img">,
  "src" | "alt" | "width" | "height"
>;

export function BrandWordmark(props: BrandWordmarkProps) {
  return (
    <img
      {...props}
      src="/brand/creonome-wordmark-black.svg"
      alt="Creonome"
      width="1398"
      height="302"
    />
  );
}
