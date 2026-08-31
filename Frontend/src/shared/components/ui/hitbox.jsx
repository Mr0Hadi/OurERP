import * as React from "react"

import { cn } from "@/shared/lib/utils"

/**
 * Invisibly expands a small control's touch/click target beyond its visible
 * box, without affecting layout — used to keep tiny icon-only controls (like
 * ComboboxChip's remove button) comfortably tappable.
 */
const SIZE_CLASSES = {
  sm: "before:-inset-1.5",
  md: "before:-inset-2",
  lg: "before:-inset-2.5",
}

const RADIUS_CLASSES = {
  sm: "before:rounded-sm",
  md: "before:rounded-md",
  lg: "before:rounded-lg",
  full: "before:rounded-full",
}

function Hitbox({
  size = "md",
  radius = "md",
  className,
  children,
  ...props
}) {
  return (
    <span
      data-slot="hitbox"
      className={cn(
        "relative inline-flex before:absolute before:content-['']",
        SIZE_CLASSES[size],
        RADIUS_CLASSES[radius],
        className
      )}
      {...props}>
      {children}
    </span>
  );
}

export { Hitbox }
