import type { Ref } from 'vue'

export function useFloorPlan(containerRef: Ref<HTMLElement | null>) {
  function toPercent(event: MouseEvent): { x: number; y: number } {
    const el = containerRef.value
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    }
  }

  function fromPercentToPixels(xPct: number, yPct: number): { x: number; y: number } {
    const el = containerRef.value
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: (xPct / 100) * rect.width,
      y: (yPct / 100) * rect.height,
    }
  }

  return { toPercent, fromPercentToPixels }
}
