export interface User {
  id: string
  firstName: string
  lastName: string
  userName: string
  avatarUrl: string | null
  isOnline: boolean
}

export interface Message {
  id: string
  content: string
  type: 'TEXT' | 'IMAGE' | 'FILE' // Defaulted to TEXT based on schema
  createdAt: string // ISO Date string from JSON
  updatedAt: string
  userId: string
  channelId: string
  parentId: string | null
  hashtags: string[]
  user: Partial<User> // correlated to your include: { user: ... }
}

export interface FetchMessagesResponse {
  channelId: string
  messages: Message[]
  nextCursor: string | null
}

// Input for the form
export interface MessageFormValues {
  content: string
}

export interface ChatState {
  // Map channelId -> Messages[]
  // We use a Record for O(1) lookups
  messages: Record<string, Message[]>

  // Map channelId -> nextCursor (for pagination)
  cursors: Record<string, string | null>

  // Connection status
  isConnected: boolean

  // Socket instance (stored in state, treated as singleton)
  socket: any | null

  // Actions
  connect: () => void
  disconnect: () => void

  // Messaging
  sendMessage: (channelId: string, content: string, parentId?: string) => void
  fetchMessages: (channelId: string, limit?: number) => void

  // UI Helpers
  getMessages: (channelId: string) => Message[]
  hasMore: (channelId: string) => boolean
}
