import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import {
  chatApi,
  type CreateChannelInput,
  type UpdateUsernameInput,
} from '../api/chat'

/**
 * Hook for Creating a Channel
 */
export const useCreateChannelForm = (onSuccess?: () => void) => {
  // We need to fetch channels again after creating one so the sidebar updates
  // Note: You might need to add a `fetchChannels` action to your Zustand store
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateChannelInput>()

  const onSubmit: SubmitHandler<CreateChannelInput> = async (data) => {
    setError(null)
    try {
      await chatApi.createChannel(data)
      reset() // Clear form
      if (onSuccess) onSuccess()
      // Optional: Trigger a store refresh here if you have a method for it
      // useChatStore.getState().fetchChannels();
      window.location.reload() // Temporary fallback to refresh list
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || 'Failed to create channel')
    }
  }

  return {
    register,
    submitChannel: handleSubmit(onSubmit),
    errors,
    isSubmitting,
    apiError: error,
  }
}

/**
 * Hook for Updating Username
 */
export const useUpdateUsernameForm = () => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUsernameInput>()

  const onSubmit: SubmitHandler<UpdateUsernameInput> = async (data) => {
    setError(null)
    setSuccessMsg(null)
    try {
      const response = await chatApi.updateUsername(data)
      setSuccessMsg(response.message)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update username')
    }
  }

  return {
    register,
    submitUsername: handleSubmit(onSubmit),
    errors,
    isSubmitting,
    apiError: error,
    successMsg,
  }
}

/**
 * Hook for Managing Members (Add/Remove)
 * This one doesn't necessarily need React Hook Form as it's often button clicks,
 * but here is how you wrap the API calls.
 */
export const useMemberManagement = () => {
  const [isLoading, setIsLoading] = useState(false)

  const handleAddMember = async (channelId: string, targetUserId: string) => {
    setIsLoading(true)
    try {
      await chatApi.addMember({ channelId, targetUserId })
      alert('Member added successfully')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add member')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (
    channelId: string,
    targetUserId: string,
  ) => {
    if (!confirm('Are you sure?')) return

    setIsLoading(true)
    try {
      await chatApi.removeMember({ channelId, targetUserId })
      alert('Member removed successfully')
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove member')
    } finally {
      setIsLoading(false)
    }
  }

  return { handleAddMember, handleRemoveMember, isLoading }
}

/**
 * Hook for creating a DM (usually triggered by clicking a user)
 */
export const useCreateDM = () => {
  const [loading, setLoading] = useState(false)

  const startDM = async (targetUserId: string) => {
    setLoading(true)
    try {
      const channel = await chatApi.createDM({ targetUserId })
      // Redirect logic or Store update usually goes here
      return channel
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return { startDM, loading }
}
