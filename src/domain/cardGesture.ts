type Point = { clientX: number; clientY: number }
type Input = 'pointer' | 'touch'
type Gesture = { input: Input; id: number; start: Point; axis: 'pending' | 'horizontal' | 'vertical' }

export function bindCardGesture(surface: HTMLElement, handlers: {
  isLocked: () => boolean
  drag: (offset: number) => void
  flip: () => void
  answer: (known: boolean) => void
}) {
  let gesture: Gesture | undefined

  function start(input: Input, id: number, point: Point, target: EventTarget | null) {
    const startedOnButton = Boolean((target as Element | null)?.closest?.('button'))
    if (gesture || handlers.isLocked() || startedOnButton) return false
    gesture = {
      input, id, start: { clientX: point.clientX, clientY: point.clientY },
      axis: 'pending',
    }
    return true
  }

  function movement(active: Gesture, point: Point) {
    const x = point.clientX - active.start.clientX
    const y = point.clientY - active.start.clientY
    if (active.axis === 'pending' && Math.hypot(x, y) > 8) {
      active.axis = Math.abs(x) > Math.abs(y) * 1.15 ? 'horizontal' : 'vertical'
    }
    return x
  }

  function finish(input: Input, id: number, point?: Point) {
    const active = gesture
    if (!active || active.input !== input || active.id !== id) return
    gesture = undefined
    handlers.drag(0)
    if (!point || handlers.isLocked()) return

    const x = movement(active, point)
    if (active.axis === 'pending') handlers.flip()
    else if (active.axis === 'horizontal' && Math.abs(x) >= 85) handlers.answer(x > 0)
  }

  function pointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0) return
    if (start('pointer', event.pointerId, event, event.target)) {
      surface.setPointerCapture(event.pointerId)
    }
  }

  function pointerMove(event: PointerEvent) {
    if (gesture?.input !== 'pointer' || gesture.id !== event.pointerId) return
    const x = movement(gesture, event)
    if (gesture.axis === 'horizontal') handlers.drag(Math.max(-140, Math.min(140, x)))
  }

  const pointerUp = (event: PointerEvent) => finish('pointer', event.pointerId, event)
  const pointerCancel = (event: PointerEvent) => finish('pointer', event.pointerId)

  function touchStart(event: TouchEvent) {
    if (event.touches.length !== 1) {
      if (gesture?.input === 'touch') finish('touch', gesture.id)
      return
    }
    const touch = event.changedTouches[0]
    if (touch) start('touch', touch.identifier, touch, event.target)
  }

  function touchMove(event: TouchEvent) {
    if (gesture?.input !== 'touch') return
    const touch = Array.from(event.changedTouches).find(({ identifier }) => identifier === gesture?.id)
    if (!touch) return
    const x = movement(gesture, touch)
    if (gesture.axis !== 'horizontal') return
    if (!event.cancelable) {
      finish('touch', touch.identifier)
      return
    }
    event.preventDefault()
    handlers.drag(Math.max(-140, Math.min(140, x)))
  }

  function touchFinish(event: TouchEvent) {
    for (const touch of Array.from(event.changedTouches)) {
      finish('touch', touch.identifier, event.type === 'touchend' ? touch : undefined)
    }
  }

  // Touch events own touch input. Pointer capture is reserved for mouse and pen.
  surface.addEventListener('touchstart', touchStart, { passive: true })
  surface.addEventListener('touchmove', touchMove, { passive: false })
  surface.addEventListener('touchend', touchFinish, { passive: true })
  surface.addEventListener('touchcancel', touchFinish, { passive: true })
  surface.addEventListener('pointerdown', pointerDown)
  surface.addEventListener('pointermove', pointerMove)
  surface.addEventListener('pointerup', pointerUp)
  surface.addEventListener('pointercancel', pointerCancel)
  surface.addEventListener('lostpointercapture', pointerCancel)

  return () => {
    surface.removeEventListener('touchstart', touchStart)
    surface.removeEventListener('touchmove', touchMove)
    surface.removeEventListener('touchend', touchFinish)
    surface.removeEventListener('touchcancel', touchFinish)
    surface.removeEventListener('pointerdown', pointerDown)
    surface.removeEventListener('pointermove', pointerMove)
    surface.removeEventListener('pointerup', pointerUp)
    surface.removeEventListener('pointercancel', pointerCancel)
    surface.removeEventListener('lostpointercapture', pointerCancel)
  }
}
