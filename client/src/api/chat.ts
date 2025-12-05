import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create a configured instance
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // CRITICAL: Allows sending cookies to backend
})

// --- TYPE DEFINITIONS FOR INPUTS ---

export interface CreateChannelInput {
  name: string
  description?: string
  isPrivate?: boolean
}

export interface CreateDMInput {
  targetUserId: string
}

export interface AddMemberInput {
  channelId: string
  targetUserId: string
}

export interface RemoveMemberInput {
  channelId: string
  targetUserId: string
}

export interface UpdateUsernameInput {
  username: string
}

// --- API FUNCTIONS ---

export const chatApi = {
  // 1. GET /channels
  getUserChannels: async () => {
    const { data } = await apiClient.get('/chat/channels')
    return data
  },

  // 2. POST /channels/create
  createChannel: async (payload: CreateChannelInput) => {
    const { data } = await apiClient.post('/chat/channels/create', payload)
    return data
  },

  // 3. POST /channels/dm
  createDM: async (payload: CreateDMInput) => {
    const { data } = await apiClient.post('/chat/channels/dm', payload)
    return data
  },

  // 4. POST /channels/add-member
  addMember: async (payload: AddMemberInput) => {
    const { data } = await apiClient.post('/chat/channels/add-member', payload)
    return data
  },

  // 5. DELETE /channels/remove-member
  // Note: Axios DELETE requires the body to be in the `data` config property
  removeMember: async (payload: RemoveMemberInput) => {
    const { data } = await apiClient.delete('/chat/channels/remove-member', {
      data: payload,
    })
    return data
  },

  // 6. PUT /profile/username
  updateUsername: async (payload: UpdateUsernameInput) => {
    const { data } = await apiClient.put('/chat/profile/username', payload)
    return data
  },

  // 7. GET /profile/check-username
  checkUsernameAvailability: async (username: string) => {
    const { data } = await apiClient.get('/chat/profile/check-username', {
      params: { username },
    })
    return data
  },
  searchUsers: async (query: string) => {
    const { data } = await apiClient.get('/users/search', {
      params: { query },
    })
    return data
  },
}
