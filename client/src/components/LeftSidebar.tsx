// src/components/chat/LeftSidebar.tsx
import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Hash,
  Lock,
  LogOut,
  Settings,
  UserPlus,
  Loader2,
  MessageSquarePlus,
} from 'lucide-react'
import { chatApi } from '@/api/chat'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/uiStore'
import { useCreateDM } from '@/hooks/useChatActions'
import { CreateChannelDialog } from './CreateChannelDialog'
import { toast } from 'sonner'
import type { User } from '@/types/chat'

export function LeftSidebar() {
  const { user, logout } = useAuthStore()
  const { activeChannelId, setActiveChannel } = useUIStore()
  const { startDM } = useCreateDM()

  const [channels, setChannels] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const [activeTab, setActiveTab] = useState('channels')
  const [foundUsers, setFoundUsers] = useState<User[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)

  const refreshChannels = async () => {
    try {
      const data = await chatApi.getUserChannels()
      setChannels(data || []) // Ensure we handle the response structure correctly
    } catch (e) {
      console.error('Failed to fetch channels')
    }
  }

  useEffect(() => {
    refreshChannels()
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    if (activeTab === 'dms') {
      const normalized = rawValue.replace(/[^a-zA-Z]/g, '')
      setSearchTerm(normalized)
    } else {
      setSearchTerm(rawValue)
    }
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (activeTab === 'dms' && searchTerm.length > 0) {
        setIsSearchingUsers(true)
        try {
          const results = await chatApi.searchUsers(searchTerm)
          setFoundUsers(results.filter((u: User) => u.id !== user?.id) || [])
        } catch (error) {
          console.error('User search failed', error)
        } finally {
          setIsSearchingUsers(false)
        }
      } else if (searchTerm.length === 0) {
        setFoundUsers([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm, activeTab, user?.id])

  const handleUserClick = async (targetUser: User) => {
    try {
      toast.loading(`Starting chat with ${targetUser.userName}...`)
      const channel = await startDM(targetUser.id)
      if (channel) {
        toast.dismiss()
        setActiveChannel(channel.id, targetUser.userName || 'Chat')
        refreshChannels()
        setSearchTerm('')
        // Clear found users so we go back to the list
        setFoundUsers([])
      }
    } catch (error) {
      toast.error('Failed to start conversation')
    }
  }

  // --- LOGIC HELPERS ---

  // 1. Split channels into Types
  const regularChannels = channels.filter(
    (c) =>
      c.type !== 'DM' &&
      c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // 2. For DMs, we filter based on the OTHER user's name, not the channel name "dm_channel"
  const dmChannels = channels.filter((c) => c.type === 'DM')

  // 3. Helper to get the "Other" user object from a DM channel
  const getDMUser = (channel: any) => {
    if (!user) return null
    // Find the member that is NOT the current logged-in user
    const member = channel.members.find((m: any) => m.userId !== user.id)
    return member?.user
  }

  // 4. Filter DMs based on search term (searching for the friend's name)
  const filteredDMs = dmChannels.filter((c) => {
    const otherUser = getDMUser(c)
    if (!otherUser) return false
    return otherUser.userName.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="bg-muted/20 flex h-full flex-col border-r">
      <div className="p-4 pb-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Connect</h2>
            <CreateChannelDialog onChannelCreated={refreshChannels} />
          </div>

          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="dms">Messages</TabsTrigger>
          </TabsList>

          <div className="relative my-4">
            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
            <Input
              placeholder={
                activeTab === 'dms'
                  ? 'Find users or chats...'
                  : 'Search channels...'
              }
              className="pl-8"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {isSearchingUsers && (
              <Loader2 className="text-muted-foreground absolute top-2.5 right-2 h-4 w-4 animate-spin" />
            )}
          </div>

          {/* --- TAB 1: REGULAR CHANNELS --- */}
          <TabsContent value="channels" className="m-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-1 pr-4">
                {regularChannels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant={
                      activeChannelId === channel.id ? 'secondary' : 'ghost'
                    }
                    className="w-full justify-start font-normal"
                    onClick={() => setActiveChannel(channel.id, channel.name)}
                  >
                    {channel.isPrivate ? (
                      <Lock className="mr-2 h-4 w-4 opacity-70" />
                    ) : (
                      <Hash className="mr-2 h-4 w-4 opacity-70" />
                    )}
                    {channel.name}
                  </Button>
                ))}
                {regularChannels.length === 0 && (
                  <div className="text-muted-foreground py-4 text-center text-sm">
                    No channels found
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* --- TAB 2: DMs (Search Results OR Existing DMs) --- */}
          <TabsContent value="dms" className="m-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-1 pr-4">
                {/* STATE A: User is searching for NEW people */}
                {searchTerm.length > 0 && foundUsers.length > 0 && (
                  <div className="mb-4">
                    <p className="text-muted-foreground px-2 py-2 text-xs font-semibold uppercase">
                      New Conversations
                    </p>
                    {foundUsers.map((u) => (
                      <Button
                        key={u.id}
                        variant="ghost"
                        className="h-12 w-full justify-start gap-3 font-normal"
                        onClick={() => handleUserClick(u)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={u.avatarUrl || undefined} />
                          <AvatarFallback>
                            {u.userName?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{u.userName}</span>
                        <UserPlus className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    ))}
                  </div>
                )}

                {/* STATE B: Existing DM List (Always show unless filtered out) */}
                <p className="text-muted-foreground px-2 py-2 text-xs font-semibold uppercase">
                  Recent Messages
                </p>

                {filteredDMs.map((channel) => {
                  const otherUser = getDMUser(channel)
                  if (!otherUser) return null

                  return (
                    <Button
                      key={channel.id}
                      variant={
                        activeChannelId === channel.id ? 'secondary' : 'ghost'
                      }
                      className="h-12 w-full justify-start gap-3 font-normal"
                      onClick={() =>
                        setActiveChannel(channel.id, otherUser.userName)
                      }
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={otherUser.avatarUrl || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {otherUser.userName?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="w-full truncate text-left">
                          {otherUser.userName}
                        </span>
                      </div>
                    </Button>
                  )
                })}

                {filteredDMs.length === 0 && foundUsers.length === 0 && (
                  <div className="text-muted-foreground mt-8 flex flex-col items-center gap-2 p-2 text-sm">
                    <MessageSquarePlus className="mb-2 h-8 w-8 opacity-20" />
                    <p>No messages found.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* --- USER FOOTER (Unchanged) --- */}
      <div className="bg-background mt-auto border-t p-4">
        {user ? (
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="hover:bg-muted flex h-14 w-full items-center justify-start gap-3 px-2"
                >
                  <Avatar className="h-9 w-9 border">
                    <AvatarImage
                      src={user.avatarUrl || undefined}
                      alt={user.userName || ''}
                    />
                    <AvatarFallback>
                      {user.userName?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-semibold">{user.userName}</span>
                    <span className="text-muted-foreground text-xs">
                      Online
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start" side="top">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button className="w-full">Log In</Button>
        )}
      </div>
    </div>
  )
}
