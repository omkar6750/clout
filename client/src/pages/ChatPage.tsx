// src/pages/ChatPage.tsx
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import { LeftSidebar } from '@/components/LeftSidebar'
import { RightSidebar } from '@/components/RightSidebar'
import { ChatArea } from '@/components/ChatArea'
import { Sheet, SheetContent } from '@/components/ui/sheet'

export default function ChatPage() {
  const { connect, disconnect } = useChatStore()
  const { fetchMe } = useAuthStore()
  const {
    isLeftSidebarOpen,
    isRightSidebarOpen,
    setLeftSidebar,
    toggleRightSidebar,
  } = useUIStore()

  // Initialize Data
  useEffect(() => {
    fetchMe()
    connect()
    return () => disconnect()
  }, [])

  return (
    <div className="bg-background flex h-screen w-full overflow-hidden">
      {/* --- DESKTOP LEFT SIDEBAR (Hidden on mobile) --- */}
      <div className="hidden w-[300px] flex-shrink-0 md:block">
        <LeftSidebar />
      </div>

      {/* --- MAIN CHAT AREA --- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatArea />
      </div>

      {/* --- DESKTOP RIGHT SIDEBAR (Hidden on mobile) --- */}
      {/* We can make this collapsible or fixed. Fixed for now for 'Holy Grail' layout */}
      <div
        className={`hidden w-[320px] transition-all duration-300 lg:block ${isRightSidebarOpen ? 'mr-0' : '-mr-[320px]'} border-l`}
      >
        <RightSidebar />
      </div>

      {/* --- MOBILE: LEFT SHEET --- */}
      <Sheet open={isLeftSidebarOpen} onOpenChange={setLeftSidebar}>
        <SheetContent side="left" className="w-[300px] p-0">
          <LeftSidebar />
        </SheetContent>
      </Sheet>

      {/* --- MOBILE/TABLET: RIGHT SHEET --- */}
      {/* Note: On Desktop lg screens, we use the sidebar above. On smaller screens, we use Sheet */}
      <Sheet open={isRightSidebarOpen} onOpenChange={toggleRightSidebar}>
        <SheetContent
          side="right"
          className="w-[320px] p-0 sm:w-[400px] lg:hidden"
        >
          <RightSidebar />
        </SheetContent>
      </Sheet>
    </div>
  )
}
