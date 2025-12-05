// src/components/chat/RightSidebar.tsx
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Bot, Sparkles, X, Send } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useState } from 'react'

export function RightSidebar() {
  const { aiContextTags, removeContextTag, activeChannelName } = useUIStore()
  const [prompt, setPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState<string | null>(null)

  const handleAskAI = () => {
    if (!prompt) return
    // Mock AI Call
    setAiResponse(
      'Here is a summary based on ' +
        aiContextTags.join(', ') +
        ': The team discussed the new API endpoints.',
    )
  }

  return (
    <div className="bg-muted/20 flex h-full flex-col border-l">
      {/* Header */}
      <div className="flex items-center gap-2 border-b p-4">
        <Bot className="h-5 w-5 text-purple-600" />
        <h2 className="font-semibold">AI Copilot</h2>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Context Section */}
          <div>
            <h3 className="text-muted-foreground mb-3 text-xs font-medium uppercase">
              Active Context
            </h3>
            {aiContextTags.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border-2 border-dashed p-4 text-center text-sm italic">
                Click hashtags (#bug, #feature) in chat to add context.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {aiContextTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
                      onClick={() => removeContextTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* AI Interaction */}
          {aiResponse && (
            <div className="rounded-lg border border-purple-100 bg-purple-50 p-3 text-sm dark:border-purple-800 dark:bg-purple-900/20">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-purple-600">
                <Sparkles className="h-3 w-3" /> AI Response
              </div>
              {aiResponse}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-background border-t p-4">
        <div className="relative">
          <Textarea
            placeholder={`Ask about ${activeChannelName || 'this chat'}...`}
            className="min-h-[80px] resize-none pr-10"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8"
            onClick={handleAskAI}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          className="mt-2 w-full text-xs"
          onClick={() => setAiResponse('Summarizing last 50 messages...')}
        >
          <Sparkles className="mr-2 h-3 w-3" /> Summarize Channel
        </Button>
      </div>
    </div>
  )
}
