import { PinTask } from './types'

const KEY = 'vidpin_tasks'

export function getTasks(): PinTask[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function saveTask(task: PinTask): void {
  const all = getTasks()
  all.unshift(task)
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function deleteTask(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getTasks().filter((t) => t.id !== id)))
}

export function getTasksForPin(pinId: string): PinTask[] {
  return getTasks().filter((t) => t.pinId === pinId)
}
