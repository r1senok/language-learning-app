import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bindCardGesture } from '../src/domain/cardGesture.ts'

function fixture() {
  const surface = new EventTarget()
  const calls = { capture: [], drag: [], answers: [], flips: 0 }
  surface.setPointerCapture = (id) => calls.capture.push(id)
  let locked = false
  const unbind = bindCardGesture(surface, {
    drag: (x) => calls.drag.push(x),
    flip: () => calls.flips++,
    answer: (known) => { calls.answers.push(known); locked = true },
    isLocked: () => locked,
  })
  const emit = (name, values, cancelable = true) => {
    const event = Object.assign(new Event(name, { cancelable }), values)
    surface.dispatchEvent(event)
    return event
  }
  const touch = (name, x, y, cancelable) => {
    const point = { clientX: x, clientY: y, identifier: 1 }
    return emit(name, { touches: name === 'touchend' ? [] : [point], changedTouches: [point] }, cancelable)
  }
  const pointer = (name, clientX, clientY, pointerType = 'mouse') => emit(name, {
    pointerId: 1, pointerType, clientX, clientY, button: 0, isPrimary: true,
  })
  return { surface, touch, pointer, calls, unbind }
}

test('touch follows the horizontal gesture and answers once from the final release position', () => {
  const { touch, pointer, calls } = fixture()
  pointer('pointerdown', 0, 0, 'touch')
  touch('touchstart', 0, 0)
  assert.equal(touch('touchmove', 40, 3).defaultPrevented, true)
  assert.deepEqual(calls.drag, [40])
  touch('touchend', 90, 4)
  pointer('pointerup', 90, 4, 'touch')
  touch('touchstart', 0, 0)
  touch('touchend', -100, 0)
  assert.deepEqual(calls.answers, [true])
  assert.deepEqual(calls.drag, [40, 0])
  assert.deepEqual(calls.capture, [])
  assert.equal(calls.flips, 0)
})

test('vertical scrolling, a short swipe and touch cancellation do not flip or answer', () => {
  const { touch, calls } = fixture()
  touch('touchstart', 0, 0)
  assert.equal(touch('touchmove', 3, 30).defaultPrevented, false)
  touch('touchend', 100, 140)
  touch('touchstart', 0, 0)
  touch('touchmove', -40, 1)
  touch('touchend', -40, 1)
  touch('touchstart', 0, 0)
  touch('touchmove', 120, 0)
  touch('touchcancel', 120, 0)
  touch('touchstart', 0, 0)
  touch('touchmove', 100, 0, false)
  touch('touchend', 100, 0)
  assert.deepEqual(calls.answers, [])
  assert.equal(calls.flips, 0)
  assert.equal(calls.drag.at(-1), 0)
  touch('touchstart', 0, 0)
  touch('touchend', 2, 1)
  assert.equal(calls.flips, 1)
})

test('mouse capture handles a left swipe, and loss of capture cancels the drag', () => {
  const { pointer, calls, unbind } = fixture()
  pointer('pointerdown', 100, 100)
  pointer('pointermove', 0, 100)
  pointer('lostpointercapture', 0, 100)
  pointer('pointerup', 0, 100)
  assert.deepEqual(calls.answers, [])
  pointer('pointerdown', 100, 100)
  pointer('pointerup', 101, 101)
  assert.equal(calls.flips, 1)
  pointer('pointerdown', 100, 100)
  pointer('pointermove', 0, 100)
  pointer('pointerup', 0, 100)
  assert.deepEqual(calls.capture, [1, 1, 1])
  assert.deepEqual(calls.answers, [false])
  unbind()
})

test('card buttons do not start a tap-to-flip or swipe gesture', () => {
  const { surface, touch, calls } = fixture()
  surface.closest = () => surface
  touch('touchstart', 0, 0)
  touch('touchend', 0, 0)
  assert.equal(calls.flips, 0)
  touch('touchstart', 0, 0)
  assert.equal(touch('touchmove', -90, 0).defaultPrevented, false)
  touch('touchend', -100, 0)
  assert.deepEqual(calls.answers, [])
})
