import * as React from "react"

// use-layout-effect.tsx
// https://github.com/radix-ui/primitives/blob/main/packages/react/use-layout-effect/src/use-layout-effect.tsx

/**
 * On the server, React emits a warning when calling `useLayoutEffect`.
 * This is because neither `useLayoutEffect` nor `useEffect` run on the server.
 * We use this safe version which suppresses the warning by replacing it with a noop on the server.
 *
 * See: https://reactjs.org/docs/hooks-reference.html#uselayouteffect
 */
const useLayoutEffect = globalThis?.document ? React.useLayoutEffect : () => {}

// use-controllable-state.tsx
// https://github.com/radix-ui/primitives/blob/main/packages/react/use-controllable-state/src/use-controllable-state.tsx

// Prevent bundlers from trying to optimize the import
const useInsertionEffect =
  (React)[" useInsertionEffect ".trim().toString()] || useLayoutEffect

export function useControllableState(
  {
    prop,
    defaultProp,
    onChange = () => {},
    caller
  }
) {
  const [uncontrolledProp, setUncontrolledProp, onChangeRef] =
    useUncontrolledState({
      defaultProp,
      onChange,
    })
  const isControlled = prop !== undefined
  const value = isControlled ? prop : uncontrolledProp

  // OK to disable conditionally calling hooks here because they will always run
  // consistently in the same environment. Bundlers should be able to remove the
  // code block entirely in production.
  /* eslint-disable react-hooks/rules-of-hooks */
  if (process.env.NODE_ENV !== "production") {
    const isControlledRef = React.useRef(prop !== undefined)
    React.useEffect(() => {
      const wasControlled = isControlledRef.current
      if (wasControlled !== isControlled) {
        const from = wasControlled ? "controlled" : "uncontrolled"
        const to = isControlled ? "controlled" : "uncontrolled"
        console.warn(
          `${caller} is changing from ${from} to ${to}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
        )
      }
      isControlledRef.current = isControlled
    }, [isControlled, caller])
  }
  /* eslint-enable react-hooks/rules-of-hooks */

  const setValue = React.useCallback((nextValue) => {
    if (isControlled) {
      const value = isFunction(nextValue) ? nextValue(prop) : nextValue
      if (value !== prop) {
        onChangeRef.current?.(value)
      }
    } else {
      setUncontrolledProp(nextValue)
    }
  }, [isControlled, prop, setUncontrolledProp, onChangeRef])

  return [value, setValue]
}

function useUncontrolledState(
  {
    defaultProp,
    onChange
  }
) {
  const [value, setValue] = React.useState(defaultProp)
  const prevValueRef = React.useRef(value)

  const onChangeRef = React.useRef(onChange)
  useInsertionEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      onChangeRef.current?.(value)
      prevValueRef.current = value
    }
  }, [value, prevValueRef])

  return [value, setValue, onChangeRef]
}

function isFunction(value) {
  return typeof value === "function"
}
