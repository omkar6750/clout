import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type { FetchMessagesResponse, Message } from '@/types/chat'

// Configuration
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

interface ChatStore {
  socket: Socket | null
  isConnected: boolean

  // State: Keyed by channelId
  messages: Record<string, Message[]>
  cursors: Record<string, string | null> // If null, no more messages to load

  // Actions
  connect: () => void
  disconnect: () => void

  // API Calls (Emits)
  // joinChannel: (channelId: string) => void // Optional, if you add rooms later
  sendMessage: (
    channelId: string,
    content: string,
    parentId?: string | null,
  ) => void
  loadMoreMessages: (channelId: string) => void

  // Getters
  getChannelMessages: (channelId: string) => Message[]
}

export const useChatStore = create<ChatStore>((set, get) => ({
  socket: null,
  isConnected: false,
  messages: {},
  cursors: {},

  connect: () => {
    const { socket } = get()
    if (socket?.connected) return

    // Initialize Socket
    // withCredentials: true is REQUIRED for your HttpOnly cookie to be sent
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
      reconnectionAttempts: 5,
    })

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id)
      set({ isConnected: true })
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
      set({ isConnected: false })
    })

    newSocket.on('error', (err) => {
      console.error('Socket error:', err)
    })

    // ---- LISTENERS FOR INCOMING DATA ----

    // 1. Handle Real-time Messages (DM & Channel share structure in your backend)
    const handleReceive = (message: Message) => {
      const currentMessages = get().messages[message.channelId] || []

      // Prevent duplicates just in case
      if (currentMessages.find((m) => m.id === message.id)) return

      set((state) => ({
        messages: {
          ...state.messages,
          [message.channelId]: [
            ...(state.messages[message.channelId] || []),
            message,
          ],
        },
      }))
    }

    newSocket.on('dm:receive', handleReceive)
    newSocket.on('channel:receive', handleReceive)

    // 2. Handle Pagination Results
    const handlePage = (data: FetchMessagesResponse) => {
      const { channelId, messages: newMessages, nextCursor } = data

      set((state) => {
        const existing = state.messages[channelId] || []

        // Merge: New (older) messages go at the START, existing (newer) at the END
        // We filter to ensure no ID collisions if network is flaky
        const uniqueNew = newMessages.filter(
          (nm: Message) => !existing.some((em) => em.id === nm.id),
        )

        const sortedNew = [...uniqueNew].reverse()

        return {
          messages: {
            ...state.messages,
            [channelId]: [...sortedNew, ...existing],
          },
          cursors: {
            ...state.cursors,
            [channelId]: nextCursor, // Updates cursor for next fetch
          },
        }
      })
    }

    newSocket.on('dm:page', handlePage)
    newSocket.on('channel:page', handlePage)

    set({ socket: newSocket })
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  },

  // joinChannel: (channelId: string) => {
  // If you need to emit a 'join' event later, do it here.
  // For now, we just ensure we have an empty array if undefined
  //   set((state) => {
  //     if (!state.messages[channelId]) {
  //       return {
  //         messages: { ...state.messages, [channelId]: [] },
  //         cursors: { ...state.cursors, [channelId]: 'initial' }, // 'initial' triggers first fetch
  //       }
  //     }
  //     return {}
  //   })

  //   // Auto-fetch if empty
  //   const { messages, loadMoreMessages } = get()
  //   if (!messages[channelId] || messages[channelId].length === 0) {
  //     loadMoreMessages(channelId)
  //   }
  // },

  sendMessage: (channelId, content, parentId = null) => {
    const { socket } = get()
    if (!socket) return

    socket.emit('message:send', { channelId, content, parentId })
  },

  loadMoreMessages: (channelId) => {
    const { socket, cursors } = get()
    if (!socket) return

    const currentCursor = cursors[channelId]

    // If cursor is strictly null, we've reached the end.
    // If it's undefined or "initial", we fetch start.
    if (currentCursor === null) return

    const payload = {
      channelId,
      limit: 20,
      cursor: currentCursor === 'initial' ? undefined : currentCursor,
    }

    socket.emit('messages:fetch', payload)
  },

  getChannelMessages: (channelId) => {
    return get().messages[channelId] || []
  },
}))
