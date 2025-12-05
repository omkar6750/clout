// src/components/chat/CreateChannelDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus } from 'lucide-react'
import { useCreateChannelForm } from '@/hooks/useChatActions' // Your hook
import { useState } from 'react'
import { toast } from 'sonner'

export function CreateChannelDialog({
  onChannelCreated,
}: {
  onChannelCreated: () => void
}) {
  const [open, setOpen] = useState(false)

  const onSuccess = () => {
    setOpen(false)
    toast.success('Channel created successfully')
    onChannelCreated()
  }

  const { register, submitChannel, isSubmitting, errors } =
    useCreateChannelForm(onSuccess)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={submitChannel} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              placeholder="e.g. project-alpha"
              {...register('name', { required: true })}
            />
            {errors.name && (
              <span className="text-xs text-red-500">Name is required</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What's this about?"
              {...register('description')}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="private" {...register('isPrivate')} />
            <Label htmlFor="private">Private Channel</Label>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Channel'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
