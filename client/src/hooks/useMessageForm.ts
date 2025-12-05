import { useForm, type SubmitHandler } from 'react-hook-form'
import { useEffect } from 'react'
import { useChatStore } from '../store/chatStore'

interface MessageFormInputs {
  content: string
}

export const useMessageForm = (channelId: string, parentId?: string) => {
  const sendMessage = useChatStore((state) => state.sendMessage)
  const isConnected = useChatStore((state) => state.isConnected)

  // Initialize React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting, isValid },
  } = useForm<MessageFormInputs>({
    defaultValues: { content: '' },
    mode: 'onChange', // Validate on change to enable/disable button
  })

  // Focus input when channel changes
  useEffect(() => {
    setFocus('content')
  }, [channelId, setFocus])

  const onSubmit: SubmitHandler<MessageFormInputs> = (data) => {
    if (!data.content.trim()) return

    try {
      sendMessage(channelId, data.content, parentId)

      // Reset immediately for optimistic UI feel
      // (Actual message appears when socket 'receive' event fires)
      reset()

      // Optional: If you want to keep focus
      setTimeout(() => setFocus('content'), 0)
    } catch (error) {
      console.error('Failed to send', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(onSubmit)()
    }
  }

  return {
    register,
    onSubmit: handleSubmit(onSubmit),
    handleKeyDown,
    errors,
    isSubmitting,
    isValid,
    isConnected,
  }
}
