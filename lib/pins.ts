import { Pin, ChatThread, ChatMessage } from './types'

const PINS_KEY = 'vidpin_pins'
const THREADS_KEY = 'vidpin_threads'

export function getPins(): Pin[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(PINS_KEY) || '[]')
  } catch {
    return []
  }
}

export function savePin(pin: Pin): void {
  const pins = getPins()
  const existing = pins.findIndex((p) => p.id === pin.id)
  if (existing >= 0) {
    pins[existing] = pin
  } else {
    pins.unshift(pin)
  }
  localStorage.setItem(PINS_KEY, JSON.stringify(pins))
}

export function deletePin(id: string): void {
  const pins = getPins().filter((p) => p.id !== id)
  localStorage.setItem(PINS_KEY, JSON.stringify(pins))
  const threads = getThreads().filter((t) => t.pinId !== id)
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads))
}

export function getPin(id: string): Pin | undefined {
  return getPins().find((p) => p.id === id)
}

function getThreads(): ChatThread[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(THREADS_KEY) || '[]')
  } catch {
    return []
  }
}

export function getThread(pinId: string): ChatThread {
  const threads = getThreads()
  const existing = threads.find((t) => t.pinId === pinId)
  if (existing) return existing
  return { id: pinId, pinId, messages: [] }
}

export function appendMessage(pinId: string, message: ChatMessage): void {
  const threads = getThreads()
  const idx = threads.findIndex((t) => t.pinId === pinId)
  if (idx >= 0) {
    threads[idx].messages.push(message)
  } else {
    threads.push({ id: pinId, pinId, messages: [message] })
  }
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads))
}
