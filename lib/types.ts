export type PlatformType = 'youtube' | 'instagram' | 'tiktok' | 'other'

export type TagType = 'recipe' | 'editing' | 'fitness' | 'ideas' | 'workflow' | 'pointer'

export interface Pin {
  id: string
  url: string
  title: string
  summary: string
  breakdown?: string
  transcript?: string
  thumbnailUrl: string
  sourcePlatform: PlatformType
  tags: TagType[]
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatThread {
  id: string
  pinId: string
  messages: ChatMessage[]
}

export interface Board {
  id: string
  name: string
  pinIds: string[]
  createdAt: string
  updatedAt: string
}
