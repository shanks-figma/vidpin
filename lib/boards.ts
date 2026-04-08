import { Board } from './types'

const BOARDS_KEY = 'vidpin_boards'

export function getBoards(): Board[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(BOARDS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveBoard(board: Board): void {
  const boards = getBoards()
  const idx = boards.findIndex((b) => b.id === board.id)
  if (idx >= 0) boards[idx] = board
  else boards.unshift(board)
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards))
}

export function getBoard(id: string): Board | undefined {
  return getBoards().find((b) => b.id === id)
}

export function deleteBoard(id: string): void {
  const boards = getBoards().filter((b) => b.id !== id)
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards))
}

export function addPinToBoard(boardId: string, pinId: string): void {
  const board = getBoard(boardId)
  if (!board || board.pinIds.includes(pinId)) return
  board.pinIds = [pinId, ...board.pinIds]
  board.updatedAt = new Date().toISOString()
  saveBoard(board)
}

export function removePinFromBoard(boardId: string, pinId: string): void {
  const board = getBoard(boardId)
  if (!board) return
  board.pinIds = board.pinIds.filter((id) => id !== pinId)
  board.updatedAt = new Date().toISOString()
  saveBoard(board)
}
