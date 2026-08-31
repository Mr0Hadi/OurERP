"use client";
import * as React from "react"

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"
import { Virtuoso } from "react-virtuoso";

import { Hitbox } from "@/shared/components/ui/hitbox"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { cn } from "@/shared/lib/utils"

/**
 * ComboboxContent renders through a Portal, so it doesn't inherit `dir` from
 * a nearby wrapper (only from document.documentElement). ComboboxInputGroup
 * measures the ambient direction where it's actually rendered and pushes it
 * here so ComboboxContent can apply it explicitly to the portaled popup.
 */
const ComboboxDirContext = React.createContext({ dir: "ltr", setDir: () => {} })

/**
 * The scrollable viewport element behind ComboboxContent's ScrollArea.
 * ComboboxVirtualList reads this to drive react-virtuoso's
 * `customScrollParent`, so it needs the real DOM node, not ScrollArea's
 * Radix-style wrapper.
 */
const ComboboxViewportContext = React.createContext(null)

/**
 * Bridges keyboard highlight events on the (possibly distant) Combobox Root
 * down to whichever ComboboxVirtualList is currently mounted inside it, so
 * arrowing onto an item that's scrolled out of the virtualized window still
 * scrolls it into view. A ref (not state) on purpose: it's written by a
 * descendant after Root has already rendered, and reading it happens inside
 * an event callback, not during render.
 */
const ComboboxVirtualizerContext =
  React.createContext(null)

function Combobox(
  {
    onItemHighlighted,
    ...props
  }
) {
  const [dir, setDir] = React.useState("ltr")
  const contextValue = React.useMemo(() => ({ dir, setDir }), [dir])
  const virtualizerHandleRef = React.useRef(null)

  return (
    <ComboboxDirContext.Provider value={contextValue}>
      <ComboboxVirtualizerContext.Provider value={virtualizerHandleRef}>
        <ComboboxPrimitive.Root
          data-slot="combobox"
          onItemHighlighted={(value, eventDetails) => {
            onItemHighlighted?.(value, eventDetails)
            if (eventDetails.reason === "keyboard") {
              virtualizerHandleRef.current?.scrollToIndex(eventDetails.index)
            }
          }}
          {...props} />
      </ComboboxVirtualizerContext.Provider>
    </ComboboxDirContext.Provider>
  );
}

function ComboboxInputGroup({
  className,
  ...props
}) {
  const ref = React.useRef(null)
  const { setDir } = React.useContext(ComboboxDirContext)

  React.useEffect(() => {
    function update() {
      if (!ref.current) return
      setDir(getComputedStyle(ref.current).direction === "rtl" ? "rtl" : "ltr")
    }

    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
      subtree: true,
    })

    return () => observer.disconnect();
  }, [setDir])

  return (
    <ComboboxPrimitive.InputGroup
      ref={ref}
      data-slot="combobox-input-group"
      className={cn(
        "relative flex h-8 w-full items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-[input:disabled]:pointer-events-none has-[input:disabled]:bg-input/50 has-[input:disabled]:opacity-50 dark:bg-input/30 dark:has-[input:disabled]:bg-input/80",
        className
      )}
      {...props} />
  );
}

function ComboboxInput({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        "w-full min-w-0 truncate bg-transparent text-sm outline-none placeholder:text-muted-foreground",
        className
      )}
      {...props} />
  );
}

function ComboboxIcon({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Icon
      data-slot="combobox-icon"
      className={cn(
        "flex shrink-0 items-center justify-center text-muted-foreground",
        className
      )}
      {...props}>
      <ChevronDownIcon className="size-4" />
    </ComboboxPrimitive.Icon>
  );
}

function ComboboxClear({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      className={cn("shrink-0 text-muted-foreground hover:text-foreground", className)}
      {...props}>
      <XIcon className="size-3.5" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxContent({
  className,
  sideOffset = 6,
  children,
  ...props
}) {
  const { dir } = React.useContext(ComboboxDirContext)
  const [viewportElement, setViewportElement] =
    React.useState(null)

  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        dir={dir}
        data-slot="combobox-positioner"
        sideOffset={sideOffset}
        className="z-50 outline-none"
        {...props}>
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "flex max-h-80 w-[var(--anchor-width)] min-w-40 origin-[var(--transform-origin)] flex-col overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}>
          <ScrollArea className="min-h-0 flex-1" viewportRef={setViewportElement}>
            <ComboboxViewportContext.Provider value={viewportElement}>
              {children}
            </ComboboxViewportContext.Provider>
          </ScrollArea>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("flex flex-col gap-0.5", className)}
      {...props} />
  );
}

function ComboboxCollection(props) {
  return <ComboboxPrimitive.Collection {...props} />;
}

/**
 * A windowed alternative to `ComboboxList`, for lists with enough items that
 * rendering them all as DOM nodes becomes a real cost (see the "virtualize
 * lists exceeding 50 items" guideline). Opt in per-usage by swapping
 * `ComboboxList` for this component — everything else about `Combobox`
 * composition stays the same.
 *
 * Must be used with `<Combobox virtualized>` on the root so Base UI hands
 * scroll-position and typeahead bookkeeping over to the virtualizer instead
 * of assuming every item is mounted.
 *
 * Reads the currently filtered items directly from Base UI's internal
 * filtering (`Combobox.useFilteredItems`) rather than taking an `items` prop,
 * so it always windows exactly what the root would otherwise render — typing
 * a search query re-windows automatically.
 */
function ComboboxVirtualList(
  {
    estimateSize = 36,
    overscan = 8,
    className,
    children,
    ...props
  }
) {
  const items = ComboboxPrimitive.useFilteredItems()
  const viewportElement = React.useContext(ComboboxViewportContext)
  const virtualizerHandleRef = React.useContext(ComboboxVirtualizerContext)
  const virtuosoRef = React.useRef(null)

  React.useEffect(() => {
    if (!virtualizerHandleRef) return
    virtualizerHandleRef.current = {
      scrollToIndex: (index) =>
        virtuosoRef.current?.scrollIntoView({ index, behavior: "auto" }),
    }
    return () => {
      virtualizerHandleRef.current = null
    }
  }, [virtualizerHandleRef])

  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("relative", className)}
      {...props}>
      {/* customScrollParent falls back to Virtuoso's own self-contained
          scrolling until the outer ScrollArea's viewport DOM node is
          available, instead of rendering nothing while it waits — gating
          the whole list on that ref could leave it permanently empty if
          the ref never resolved in time. `style` height is only used in
          that fallback case; Virtuoso ignores it once customScrollParent
          is set. */}
      <Virtuoso
        ref={virtuosoRef}
        customScrollParent={viewportElement ?? undefined}
        style={{ height: "20rem" }}
        totalCount={items.length}
        overscan={overscan}
        defaultItemHeight={estimateSize}
        itemContent={(index) => children(items[index], index)} />
    </ComboboxPrimitive.List>
  );
}

function ComboboxEmpty({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "py-6 text-center text-sm text-muted-foreground empty:m-0 empty:p-0",
        className
      )}
      {...props} />
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md py-1.5 ps-7 pe-2 text-sm text-muted-foreground outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[selected]:text-foreground",
        className
      )}
      {...props}>
      <ComboboxPrimitive.ItemIndicator className="absolute start-2 inline-flex items-center justify-center">
        <CheckIcon className="size-3.5" />
      </ComboboxPrimitive.ItemIndicator>
      {children}
    </ComboboxPrimitive.Item>
  );
}

function ComboboxGroup({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn("flex flex-col gap-0.5", className)}
      {...props} />
  );
}

function ComboboxGroupLabel({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-group-label"
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props} />
  );
}

function ComboboxSeparator({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props} />
  );
}

function ComboboxChips({
  className,
  ...props
}) {
  const ref = React.useRef(null)
  const { setDir } = React.useContext(ComboboxDirContext)

  React.useEffect(() => {
    function update() {
      if (!ref.current) return
      setDir(getComputedStyle(ref.current).direction === "rtl" ? "rtl" : "ltr")
    }

    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
      subtree: true,
    })

    return () => observer.disconnect();
  }, [setDir])

  return (
    <ComboboxPrimitive.Chips
      ref={ref}
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className
      )}
      {...props} />
  );
}

function ComboboxValue(props) {
  return <ComboboxPrimitive.Value {...props} />;
}

function ComboboxChip({
  className,
  children,
  ...props
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-muted py-0.5 ps-2 pe-1 text-xs text-foreground",
        className
      )}
      {...props}>
      {children}
      <Hitbox size="sm" radius="sm">
        <ComboboxPrimitive.ChipRemove
          className="inline-flex size-4 items-center justify-center rounded-sm hover:bg-background/60">
          <XIcon className="size-3" />
        </ComboboxPrimitive.ChipRemove>
      </Hitbox>
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chips-input"
      className={cn(
        "min-w-16 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
        className
      )}
      {...props} />
  );
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxIcon,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxValue,
  ComboboxVirtualList,
}
