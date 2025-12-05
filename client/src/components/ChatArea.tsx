// src/components/chat/ChatArea.tsx
import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Paperclip, Send, Menu, PanelRight, Loader2 } from 'lucide-react'

// Helper to render text with clickable hashtags
const MessageContent = ({ content }: { content: string }) => {
  const { addContextTag } = useUIStore()

  // Split by hashtags (regex)
  const parts = content.split(/(#\w+)/g)

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          return (
            <span
              key={i}
              className="mx-0.5 cursor-pointer rounded bg-blue-50 px-1 font-medium text-blue-500 hover:underline dark:bg-blue-900/30"
              onClick={() => addContextTag(part)}
            >
              {part}
            </span>
          )
        }
        return part
      })}
    </p>
  )
}

// Helper to format user name safely
const getUserDisplayName = (user: any) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  return user.userName || 'Unknown User'
}

// Helper to get initials
const getInitials = (name: string) => {
  return name.substring(0, 2).toUpperCase()
}

export function ChatArea() {
  const {
    activeChannelId,
    activeChannelName,
    toggleLeftSidebar,
    toggleRightSidebar,
  } = useUIStore()
  const { messages, sendMessage, getChannelMessages, loadMoreMessages } =
    useChatStore()
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const channelMessages = activeChannelId
    ? getChannelMessages(activeChannelId)
    : []

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [channelMessages.length, activeChannelId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !activeChannelId) return

    setIsSending(true)
    // Send message via socket
    sendMessage(activeChannelId, input)

    setInput('')
    setIsSending(false)
  }

  // Handle Enter key to submit, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // @ts-ignore - Trigger form submit programmatically or call handleSend
      handleSend(e as unknown as React.FormEvent)
    }
  }

  if (!activeChannelId) {
    return (
      <div className="text-muted-foreground flex h-full flex-1 flex-col items-center justify-center bg-slate-50 dark:bg-zinc-900/50">
        <div className="bg-background mb-4 rounded-full p-6 shadow-sm">
          <Menu className="h-10 w-10 opacity-20" />
        </div>
        <p className="font-medium">Select a channel to start chatting</p>
      </div>
    )
  }

  return (
    <div className="bg-background relative flex h-full flex-col">
      {/* --- Chat Header --- */}
      <header className="bg-background/95 z-10 flex h-16 items-center justify-between border-b px-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          {/* Mobile Trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleLeftSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div>
            <h3 className="flex items-center gap-2 font-bold">
              <span className="text-muted-foreground">#</span>
              {activeChannelName}
            </h3>
            <p className="text-muted-foreground text-xs">
              {channelMessages.length} messages
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleRightSidebar}
          title="AI Context"
        >
          <PanelRight className="text-muted-foreground h-5 w-5" />
        </Button>
      </header>

      {/* --- Messages Area --- */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Load More Button */}
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 text-xs"
              onClick={() => loadMoreMessages(activeChannelId)}
            >
              Load older messages
            </Button>
          </div>

          {/* Message List */}
          {channelMessages.map((msg, index) => {
            // Grouping logic: Check if previous message was same user to hide avatar
            const isSequence =
              index > 0 && channelMessages[index - 1].user.id === msg.user.id
            const displayName = getUserDisplayName(msg.user)

            return (
              <div
                key={msg.id}
                className={`group flex gap-4 ${isSequence ? 'mt-1' : 'mt-4'}`}
              >
                {/* Avatar Column */}
                <div className="w-10 flex-shrink-0">
                  {!isSequence && (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={msg.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {isSequence && (
                    <div className="text-muted-foreground w-10 pt-1 pr-2 text-right text-xs opacity-0 select-none group-hover:opacity-100">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>

                {/* Content Column */}
                <div className="flex max-w-[85%] flex-col">
                  {!isSequence && (
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="cursor-pointer text-sm font-semibold hover:underline">
                        {displayName}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  <div className="text-foreground/90 text-sm">
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Invisible anchor for auto-scroll */}
          <div ref={scrollRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* --- Input Area --- */}
      <div className="bg-background border-t p-4">
        <div className="mx-auto max-w-4xl">
          <form
            onSubmit={handleSend}
            className="bg-muted/30 flex items-end gap-2 rounded-xl border p-2 ring-blue-500/20 transition-all focus-within:ring-2"
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-10 w-10 rounded-lg"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              // onKeyDown={handleKeyDown}
              placeholder={`Message #${activeChannelName}`}
              className="h-auto max-h-32 min-h-[44px] flex-1 border-0 bg-transparent px-2 py-3 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoComplete="off"
            />

            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isSending}
              className="h-10 w-10 shrink-0 rounded-lg transition-all"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <div className="text-muted-foreground mt-1 flex justify-between px-2 text-[10px]">
            <span>**Bold**, *Italic*, #hashtag</span>
            <span>Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  )
}
