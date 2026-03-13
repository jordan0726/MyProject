// src/features/chart/useResizeObserver.ts

import { useEffect, useState } from 'react'

/**
 * Custom React hook that observes the size of a DOM element and returns its current bounding rectangle.
 * It uses the ResizeObserver API to listen for changes to the element's size and updates the returned rect accordingly.
 *
 * @param ref - A React ref object pointing to the target HTML element to observe.
 * @returns The current DOMRectReadOnly of the observed element or null if the element is not available.
 */
export function useResizeObserver<T extends HTMLElement>(
  ref: React.RefObject<T | null>  // Allow null ref
): DOMRectReadOnly | null {
  // State to store the current bounding rectangle of the observed element
  const [observedRect, setObservedRect] = useState<DOMRectReadOnly | null>(null)

  useEffect(() => {
    // Get the current element from the ref
    const element = ref.current
    if (!element) return // Exit early if no element is available

    // Initialize the rect state immediately with the element's current bounding rect
    const initialRect = element.getBoundingClientRect()
    setObservedRect({
      ...initialRect,
      toJSON: () => ({}), // Override toJSON to avoid serialization issues
    } as DOMRectReadOnly)

    // Create a new ResizeObserver instance to listen for size changes
    const observer = new ResizeObserver(([entry]) => {
      // Update the state with the new contentRect when size changes
      setObservedRect(entry.contentRect)
    })
    observer.observe(element) // Start observing the element

    // Cleanup function to disconnect the observer when the component unmounts or ref changes
    return () => observer.disconnect()
  }, [ref])

  // Return the current observed bounding rectangle or null if not available
  return observedRect
}