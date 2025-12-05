// src/store/uiStore.ts
import { create } from 'zustand'

interface UIStore {
  // Layout State
  isLeftSidebarOpen: boolean
  isRightSidebarOpen: boolean
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  setLeftSidebar: (open: boolean) => void

  // Selection State
  activeChannelId: string | null
  activeChannelName: string | null
  setActiveChannel: (id: string, name: string) => void

  // AI Context State
  aiContextTags: string[]
  addContextTag: (tag: string) => void
  removeContextTag: (tag: string) => void
  clearContext: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  isLeftSidebarOpen: false,
  isRightSidebarOpen: false,
  toggleLeftSidebar: () =>
    set((state) => ({ isLeftSidebarOpen: !state.isLeftSidebarOpen })),
  toggleRightSidebar: () =>
    set((state) => ({ isRightSidebarOpen: !state.isRightSidebarOpen })),
  setLeftSidebar: (open) => set({ isLeftSidebarOpen: open }),

  activeChannelId: null,
  activeChannelName: null,
  setActiveChannel: (id, name) =>
    set({
      activeChannelId: id,
      activeChannelName: name,
      isLeftSidebarOpen: false,
    }), // Auto-close mobile sidebar

  aiContextTags: [],
  addContextTag: (tag) =>
    set((state) => ({
      aiContextTags: state.aiContextTags.includes(tag)
        ? state.aiContextTags
        : [...state.aiContextTags, tag],
    })),
  removeContextTag: (tag) =>
    set((state) => ({
      aiContextTags: state.aiContextTags.filter((t) => t !== tag),
    })),
  clearContext: () => set({ aiContextTags: [] }),
}))
