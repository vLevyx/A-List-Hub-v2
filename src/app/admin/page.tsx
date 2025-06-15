'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePageTracking } from '@/hooks/usePageTracking'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { getDiscordId } from '@/lib/utils'

// Admin IDs for access control
const ADMIN_DISCORD_IDS = [
  '154388953053659137',
  '344637470908088322',
  '796587763851198474',
  '492053410967846933',
  '487476487386038292'
]

// Types
interface User {
  id: string | null
  username: string | null
  created_at: string
  revoked: boolean | null
  discord_id: string
  last_login: string | null
  login_count: number | null
  hub_trial: boolean | null
  trial_expiration: string | null
}

interface AdminLog {
  id: string
  admin_id: string | null
  admin_name: string | null
  action: string | null
  target_discord_id: string | null
  created_at: string | null
  description: string | null
}

interface PageSession {
  id: string
  discord_id: string
  username: string | null
  page_path: string
  enter_time: string | null
  exit_time: string | null
  time_spent_seconds: number | null
  is_active: boolean | null
}

interface Blueprint {
  id: string
  discord_id: string | null
  blueprint_name: string
  created_at: string | null
}

interface PageData {
  page_path: string
  total_time: number
  sessions: number
}

interface UserPageData {
  [username: string]: {
    [page_path: string]: number[]
  }
}

export default function AdminPage() {
  usePageTracking()
  const { user, loading } = useAuth()
  const supabase = createClient()

  // State for user management
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterActivity, setFilterActivity] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterDateRange, setFilterDateRange] = useState('all')
  const [sortBy, setSortBy] = useState('last_login')
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [sessionHeartbeats, setSessionHeartbeats] = useState<Map<string, number>>(new Map())
  const [auditLogs, setAuditLogs] = useState<AdminLog[]>([])
  const [userBlueprints, setUserBlueprints] = useState<Blueprint[]>([])
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [newDiscordId, setNewDiscordId] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error' | 'info' | null, message: string}>({type: null, message: ''})

  // State for analytics
  const [allPageData, setAllPageData] = useState<PageSession[]>([])
  const [userPageData, setUserPageData] = useState<UserPageData>({})
  const [selectedAnalyticsUser, setSelectedAnalyticsUser] = useState('')
  const [minTime, setMinTime] = useState(0)
  const [sortByAnalytics, setSortByAnalytics] = useState('time')
  const [pagesLimit, setPagesLimit] = useState(15)
  const [logsPage, setLogsPage] = useState(0)
  const [logsLimit, setLogsLimit] = useState(15)
  const [filterAdmin, setFilterAdmin] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterDesc, setFilterDesc] = useState('')
  const [filterTarget, setFilterTarget] = useState('')

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const realtimeSubscriptionRef = useRef<any>(null)

  // Check if user is admin
  const isAdmin = useCallback(() => {
    if (!user) return false
    const discordId = getDiscordId(user)
    return discordId ? ADMIN_DISCORD_IDS.includes(discordId) : false
  }, [user])

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin()) {
      window.location.href = '/'
    }
  }, [loading, isAdmin])

  // Initialize data
  useEffect(() => {
    if (!loading && isAdmin()) {
      loadUsers()
      setupRealtimeUpdates()
      setupSessionTracking()
      loadAuditLogs()
      fetchPageSessions()
      
      // Start heartbeat monitoring
      heartbeatIntervalRef.current = setInterval(() => {
        const now = Date.now()
        const timeout = 10 * 60 * 1000 // 10 minutes timeout
        
        setSessionHeartbeats(prev => {
          const newMap = new Map(prev)
          for (const [userId, lastSeen] of newMap.entries()) {
            if (now - lastSeen > timeout) {
              newMap.delete(userId)
              setOnlineUsers(prevUsers => {
                const newUsers = new Set(prevUsers)
                newUsers.delete(userId)
                return newUsers
              })
            }
          }
          return newMap
        })
        
        updateStats()
      }, 15000)
    }
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      
      if (realtimeSubscriptionRef.current) {
        realtimeSubscriptionRef.current.unsubscribe()
      }
    }
  }, [loading, isAdmin])

  // Setup realtime updates
  const setupRealtimeUpdates = useCallback(() => {
    const usersChannel = supabase
      .channel('users_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => handleRealtimeUpdate(payload)
      )
      .subscribe()
      
    const pageSessionsChannel = supabase
      .channel('realtime:page_sessions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'page_sessions' }, 
        () => fetchPageSessions()
      )
      .subscribe()
      
    const adminLogsChannel = supabase
      .channel('realtime:admin_logs')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'admin_logs' }, 
        () => loadAuditLogs()
      )
      .subscribe()
      
    realtimeSubscriptionRef.current = {
      unsubscribe: () => {
        usersChannel.unsubscribe()
        pageSessionsChannel.unsubscribe()
        adminLogsChannel.unsubscribe()
      }
    }
  }, [supabase])

  // Handle realtime updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('Real-time update:', payload)

    switch (payload.eventType) {
      case 'INSERT':
        setAllUsers(prev => [payload.new, ...prev])
        logAuditEvent('create', `User ${payload.new.username || payload.new.discord_id} added`, payload.new.discord_id)
        break
      case 'UPDATE':
        setAllUsers(prev => {
          const index = prev.findIndex(u => u.discord_id === payload.new.discord_id)
          if (index !== -1) {
            const newUsers = [...prev]
            newUsers[index] = payload.new
            return newUsers
          }
          return prev
        })
        logAuditEvent('update', `User ${payload.new.username || payload.new.discord_id} updated`, payload.new.discord_id)
        break
      case 'DELETE':
        setAllUsers(prev => prev.filter(u => u.discord_id !== payload.old.discord_id))
        logAuditEvent('delete', `User ${payload.old.username || payload.old.discord_id} deleted`, payload.old.discord_id)
        break
    }

    applyFiltersAndSort()
    updateStats()
  }, [])

  // Setup session tracking
  const setupSessionTracking = useCallback(async () => {
    try {
      // Get current sessions from users who logged in within the last 5 minutes
      const { data: recentLogins } = await supabase
        .from('users')
        .select('discord_id, last_login, username')
        .gte('last_login', new Date(Date.now() - 5 * 60 * 1000).toISOString())

      if (recentLogins) {
        // Clear existing online users first
        setOnlineUsers(new Set())
        setSessionHeartbeats(new Map())

        recentLogins.forEach(user => {
          setOnlineUsers(prev => {
            const newSet = new Set(prev)
            newSet.add(user.discord_id)
            return newSet
          })
          
          setSessionHeartbeats(prev => {
            const newMap = new Map(prev)
            newMap.set(user.discord_id, Date.now())
            return newMap
          })
        })

        // Refresh the table display
        applyFiltersAndSort()
      }
    } catch (error) {
      console.error('Session tracking error:', error)
    }
  }, [supabase])

  // Load users
  const loadUsers = useCallback(async () => {
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setAllUsers(data || [])
      applyFiltersAndSort(data)
      updateStats(data)
    } catch (error) {
      console.error('Error loading users:', error)
      showToast('Failed to load users', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setAuditLogs(data || [])
    } catch (error) {
      console.error('Error loading audit logs:', error)
    }
  }, [supabase])

  // Fetch page sessions
  const fetchPageSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('page_sessions')
        .select('page_path, time_spent_seconds, username')
        .not('time_spent_seconds', 'is', null)

      if (error) throw error

      setAllPageData(data || [])
      
      // Process data for analytics
      const totals: Record<string, { time: number, sessions: number }> = {}
      const users: UserPageData = {}
      
      data?.forEach(row => {
        // Page totals
        if (!totals[row.page_path]) {
          totals[row.page_path] = { time: 0, sessions: 0 }
        }
        totals[row.page_path].time += row.time_spent_seconds || 0
        totals[row.page_path].sessions++

        // User data
        if (row.username) {
          if (!users[row.username]) users[row.username] = {}
          if (!users[row.username][row.page_path]) users[row.username][row.page_path] = []
          users[row.username][row.page_path].push(row.time_spent_seconds || 0)
        }
      })
      
      setUserPageData(users)
    } catch (error) {
      console.error('Error fetching page sessions:', error)
    }
  }, [supabase])

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const { data: logs, error } = await supabase
        .from('admin_logs')
        .select('*, target_discord_id')
        .order('created_at', { ascending: false })
        .range(logsPage * logsLimit, logsPage * logsLimit + logsLimit - 1)

      if (error) throw error

      const discordIds = [...new Set(logs.map(log => log.target_discord_id).filter(Boolean))]
      const { data: users } = await supabase
        .from('users')
        .select('discord_id, username')
        .in('discord_id', discordIds)

      const idToUsername = Object.fromEntries((users || []).map(u => [u.discord_id, u.username]))

      return { logs, idToUsername }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      return { logs: [], idToUsername: {} }
    }
  }, [supabase, logsPage, logsLimit])

  // Log audit event
  const logAuditEvent = useCallback(async (action: string, description: string, userId: string | null = null) => {
    try {
      if (!user) return
      
      const adminId = getDiscordId(user)
      const adminName = user.user_metadata?.full_name || 'Unknown'

      const { error } = await supabase.from('admin_logs').insert([{
        action,
        description,
        admin_id: adminId,
        admin_name: adminName,
        target_discord_id: userId,
        created_at: new Date().toISOString()
      }])

      if (error) throw error

      // Refresh logs
      loadAuditLogs()
    } catch (err) {
      console.error('Failed to log audit event:', err)
    }
  }, [supabase, user, loadAuditLogs])

  // Get blueprints for a user
  const getBlueprints = useCallback(async (discordId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_blueprints')
        .select('*')
        .eq('discord_id', discordId)

      if (error) throw error
      
      setUserBlueprints(data || [])
      return data || []
    } catch (error) {
      console.error('Error fetching blueprints:', error)
      return []
    }
  }, [supabase])

  // Add new user
  const addUser = useCallback(async () => {
    if (!newDiscordId.trim()) {
      showToast('Discord ID is required', 'error')
      return
    }

    if (allUsers.some(u => u.discord_id === newDiscordId)) {
      showToast('User already exists', 'warning')
      return
    }

    setIsAddingUser(true)

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          discord_id: newDiscordId,
          username: newUsername || null,
          revoked: false,
          created_at: new Date().toISOString()
        }])
        .select()

      if (error) throw error

      setNewDiscordId('')
      setNewUsername('')
      showToast('User whitelisted successfully', 'success')
      logAuditEvent('whitelist', `User ${newUsername || newDiscordId} whitelisted`, newDiscordId)
    } catch (error) {
      console.error('Error adding user:', error)
      showToast('Failed to whitelist user', 'error')
    } finally {
      setIsAddingUser(false)
    }
  }, [newDiscordId, newUsername, allUsers, supabase, logAuditEvent])

  // Update user status
  const updateUserStatus = useCallback(async (discordId: string, revoked: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ revoked })
        .eq('discord_id', discordId)

      if (error) throw error

      const action = revoked ? 'revoke' : 'whitelist'
      const actionText = revoked ? 'revoked' : 'whitelisted'
      const user = allUsers.find(u => u.discord_id === discordId)
      
      showToast(`User ${actionText} successfully`, 'success')
      logAuditEvent(action, `${revoked ? 'Revoke' : 'Whitelist'} action performed`, discordId)

      // Update selected user if panel is open
      if (selectedUser?.discord_id === discordId) {
        setSelectedUser(prev => prev ? { ...prev, revoked } : null)
      }
    } catch (error) {
      console.error('Error updating user status:', error)
      showToast('Failed to update user status', 'error')
    }
  }, [supabase, allUsers, logAuditEvent, selectedUser])

  // Update trial time
  const updateTrialTime = useCallback(async (discordId: string, days: number) => {
    const trialExpiration = new Date()
    trialExpiration.setDate(trialExpiration.getDate() + days)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          hub_trial: true,
          trial_expiration: trialExpiration.toISOString()
        })
        .eq('discord_id', discordId)

      if (error) throw error

      showToast(`Trial extended by ${days} days`, 'success')
      logAuditEvent('trial', `${days} Day Trial action performed`, discordId)

      // Update selected user if panel is open
      if (selectedUser?.discord_id === discordId) {
        setSelectedUser(prev => prev ? { 
          ...prev, 
          hub_trial: true,
          trial_expiration: trialExpiration.toISOString()
        } : null)
      }
    } catch (error) {
      console.error('Error updating trial:', error)
      showToast('Failed to update trial', 'error')
    }
  }, [supabase, logAuditEvent, selectedUser])

  // Convert trial to permanent whitelist
  const convertTrialToPermanent = useCallback(async (discordId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          revoked: false,
          hub_trial: false,
          trial_expiration: null
        })
        .eq('discord_id', discordId)

      if (error) throw error

      showToast('User converted to permanent whitelist', 'success')
      logAuditEvent('whitelist', 'Trial converted to permanent whitelist', discordId)

      // Update selected user if panel is open
      if (selectedUser?.discord_id === discordId) {
        setSelectedUser(prev => prev ? { 
          ...prev, 
          revoked: false,
          hub_trial: false,
          trial_expiration: null
        } : null)
      }
    } catch (error) {
      console.error('Error converting trial:', error)
      showToast('Failed to convert trial', 'error')
    }
  }, [supabase, logAuditEvent, selectedUser])

  // Delete user
  const deleteUser = useCallback(async (discordId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('discord_id', discordId)

      if (error) throw error

      const user = allUsers.find(u => u.discord_id === discordId)
      showToast('User deleted successfully', 'success')
      logAuditEvent('delete', `User ${user?.username || discordId} deleted`, discordId)

      // Close panel if open
      if (selectedUser?.discord_id === discordId) {
        setIsPanelOpen(false)
        setSelectedUser(null)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast('Failed to delete user', 'error')
    }
  }, [supabase, allUsers, logAuditEvent, selectedUser])

  // Bulk operations
  const bulkWhitelist = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'warning')
      return
    }

    if (!confirm(`Whitelist ${selectedUsers.size} selected users?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ revoked: false })
        .in('discord_id', Array.from(selectedUsers))

      if (error) throw error

      showToast(`${selectedUsers.size} users whitelisted`, 'success')
      logAuditEvent('bulk_whitelist', `Bulk Whitelist action performed`)
      clearSelection()
    } catch (error) {
      console.error('Bulk whitelist error:', error)
      showToast('Failed to whitelist users', 'error')
    }
  }, [supabase, selectedUsers, logAuditEvent])

  const bulkRevoke = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'warning')
      return
    }

    if (!confirm(`Revoke access for ${selectedUsers.size} selected users?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ revoked: true })
        .in('discord_id', Array.from(selectedUsers))

      if (error) throw error

      showToast(`${selectedUsers.size} users revoked`, 'success')
      logAuditEvent('bulk_revoke', `Bulk Revoke action performed`)
      clearSelection()
    } catch (error) {
      console.error('Bulk revoke error:', error)
      showToast('Failed to revoke users', 'error')
    }
  }, [supabase, selectedUsers, logAuditEvent])

  const bulkAddTrial = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'warning')
      return
    }

    if (!confirm(`Add 7-day trial to ${selectedUsers.size} selected users?`)) {
      return
    }

    const trialExpiration = new Date()
    trialExpiration.setDate(trialExpiration.getDate() + 7)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          hub_trial: true,
          trial_expiration: trialExpiration.toISOString()
        })
        .in('discord_id', Array.from(selectedUsers))

      if (error) throw error

      showToast(`7-day trial added for ${selectedUsers.size} users`, 'success')
      logAuditEvent('update', `Bulk trial assignment for ${selectedUsers.size} users`)
      clearSelection()
    } catch (error) {
      console.error('Bulk trial error:', error)
      showToast('Failed to add trials', 'error')
    }
  }, [supabase, selectedUsers, logAuditEvent])

  const bulkDelete = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'warning')
      return
    }

    if (!confirm(`DELETE ${selectedUsers.size} selected users? This action cannot be undone!`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .in('discord_id', Array.from(selectedUsers))

      if (error) throw error

      showToast(`${selectedUsers.size} users deleted`, 'success')
      logAuditEvent('bulk_delete', `Bulk Delete action performed`)
      clearSelection()
    } catch (error) {
      console.error('Bulk delete error:', error)
      showToast('Failed to delete users', 'error')
    }
  }, [supabase, selectedUsers, logAuditEvent])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedUsers(new Set())
  }, [])

  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.discord_id)))
    }
  }, [selectedUsers, filteredUsers])

  // Toggle user selection
  const toggleUserSelection = useCallback((discordId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(discordId)) {
        newSet.delete(discordId)
      } else {
        newSet.add(discordId)
      }
      return newSet
    })
  }, [])

  // Apply filters and sort
  const applyFiltersAndSort = useCallback((users = allUsers) => {
    let filtered = [...users]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(user =>
        user.discord_id.toLowerCase().includes(term) ||
        (user.username && user.username.toLowerCase().includes(term))
      )
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'whitelisted':
          filtered = filtered.filter(user => !user.revoked)
          break
        case 'revoked':
          filtered = filtered.filter(user => user.revoked)
          break
        case 'trial':
          filtered = filtered.filter(user => user.hub_trial &&
            user.trial_expiration && new Date(user.trial_expiration) > new Date())
          break
      }
    }

    // Apply activity filter
    if (filterActivity !== 'all') {
      const now = new Date()
      switch (filterActivity) {
        case 'active_24h':
          filtered = filtered.filter(user =>
            user.last_login && new Date(user.last_login) > new Date(now.getTime() - 24 * 60 * 60 * 1000))
          break
        case 'active_7d':
          filtered = filtered.filter(user =>
            user.last_login && new Date(user.last_login) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
          break
        case 'active_30d':
          filtered = filtered.filter(user =>
            user.last_login && new Date(user.last_login) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
          break
        case 'never_logged':
          filtered = filtered.filter(user => !user.last_login)
          break
      }
    }

    // Apply type filter
    if (filterType !== 'all') {
      switch (filterType) {
        case 'admin':
          filtered = filtered.filter(user => ADMIN_DISCORD_IDS.includes(user.discord_id))
          break
        case 'regular':
          filtered = filtered.filter(user =>
            !ADMIN_DISCORD_IDS.includes(user.discord_id) && !user.hub_trial)
          break
        case 'trial':
          filtered = filtered.filter(user => user.hub_trial)
          break
      }
    }

    // Apply date range filter
    if (filterDateRange !== 'all') {
      const now = new Date()
      let startDate: Date | undefined

      switch (filterDateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
      }

      if (startDate) {
        filtered = filtered.filter(user =>
          user.created_at && new Date(user.created_at) >= startDate!)
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'username':
          return (a.username || '').localeCompare(b.username || '')
        case 'login_count':
          return (b.login_count || 0) - (a.login_count || 0)
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'trial_expiration':
          const aExp = a.trial_expiration ? new Date(a.trial_expiration).getTime() : 0
          const bExp = b.trial_expiration ? new Date(b.trial_expiration).getTime() : 0
          return bExp - aExp
        default: // last_login
          const aLogin = a.last_login ? new Date(a.last_login).getTime() : 0
          const bLogin = b.last_login ? new Date(b.last_login).getTime() : 0
          return bLogin - aLogin
      }
    })

    setFilteredUsers(filtered)
  }, [allUsers, searchTerm, filterStatus, filterActivity, filterType, filterDateRange, sortBy])

  // Update statistics
  const updateStats = useCallback((users = allUsers) => {
    // Stats are calculated in the component render
  }, [allUsers])

  // Handle search input
  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      applyFiltersAndSort()
    }, 300)
  }, [applyFiltersAndSort])

  // Open user panel
  const openUserPanel = useCallback(async (discordId: string) => {
    const user = allUsers.find(u => u.discord_id === discordId)
    if (!user) return

    setSelectedUser(user)
    setIsPanelOpen(true)
    
    // Load user blueprints
    await getBlueprints(discordId)
  }, [allUsers, getBlueprints])

  // Close user panel
  const closeSidePanel = useCallback(() => {
    setIsPanelOpen(false)
    setSelectedUser(null)
  }, [])

  // Format date
  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return 'N/A'
    
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  // Format relative time
  const formatRelativeTime = useCallback((date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return formatDate(date.toISOString())
  }, [formatDate])

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ type, message })
    
    // Clear after 3 seconds
    setTimeout(() => {
      setStatusMessage({ type: null, message: '' })
    }, 3000)
  }, [])

  // Get trial status
  const getTrialStatus = useCallback((user: User) => {
    if (!user.hub_trial) return 'N/A'

    if (!user.trial_expiration) {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          TRIAL
        </span>
      )
    }

    const expiration = new Date(user.trial_expiration)
    const now = new Date()

    if (expiration > now) {
      const daysLeft = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return (
        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" title={`Trial expires in ${daysLeft} days`}>
          TRIAL ({daysLeft}d)
        </span>
      )
    } else {
      return (
        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
          EXPIRED
        </span>
      )
    }
  }, [])

  // Render action buttons
  const renderActionButtons = useCallback((user: User) => {
    return (
      <div className="relative inline-block text-left">
        <button 
          className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            e.currentTarget.nextElementSibling?.classList.toggle('hidden')
          }}
        >
          ☰
        </button>
        <div className="hidden absolute right-0 z-10 mt-1 w-48 origin-top-right rounded-md bg-[#222] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <button
              className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation()
                updateUserStatus(user.discord_id, !user.revoked)
                e.currentTarget.parentElement?.parentElement?.classList.add('hidden')
              }}
            >
              {user.revoked ? 'Whitelist' : 'Revoke'}
            </button>
            <button
              className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation()
                deleteUser(user.discord_id)
                e.currentTarget.parentElement?.parentElement?.classList.add('hidden')
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }, [updateUserStatus, deleteUser])

  // Analytics functions
  const updateStatistics = useCallback((data: PageSession[], users: UserPageData) => {
    // Stats are calculated in the component render
  }, [])

  const renderTopPages = useCallback((data: PageSession[]) => {
    // Group by page and calculate totals
    const totals: Record<string, { time: number, sessions: number }> = {}
    
    data.forEach(row => {
      if (!totals[row.page_path]) {
        totals[row.page_path] = { time: 0, sessions: 0 }
      }
      totals[row.page_path].time += row.time_spent_seconds || 0
      totals[row.page_path].sessions++
    })
    
    // Sort and limit
    const sorted = Object.entries(totals)
      .sort(([, a], [, b]) => b.time - a.time)
      .slice(0, pagesLimit)
    
    return (
      <table className="w-full">
        <thead className="bg-white/5">
          <tr>
            <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Rank</th>
            <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Page</th>
            <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Total Time</th>
            <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Sessions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length > 0 ? (
            sorted.map(([page, { time, sessions }], index) => (
              <tr key={page} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-3"><strong>#{index + 1}</strong></td>
                <td className="p-3">
                  <span className="inline-block bg-white/5 px-2 py-1 rounded text-sm font-mono">
                    {page}
                  </span>
                </td>
                <td className="p-3"><strong>{(time / 60).toFixed(1)} min</strong></td>
                <td className="p-3">{sessions}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="p-8 text-center text-white/60">No data available</td>
            </tr>
          )}
        </tbody>
      </table>
    )
  }, [pagesLimit])

  const renderUserTable = useCallback((userData: UserPageData, username: string) => {
    if (!userData || !username) {
      return (
        <div className="p-8 text-center text-white/60">
          Select a user to view their page analytics
        </div>
      )
    }

    // Calculate user statistics
    const entries = Object.entries(userData[username] || {})
    const totalSessions = entries.reduce((sum, [, sessions]) => sum + sessions.length, 0)
    const totalTime = entries.reduce((sum, [, sessions]) => sum + sessions.reduce((s, t) => s + t, 0), 0)
    const uniquePages = entries.length

    // Filter and sort data
    const filteredEntries = entries
      .map(([page, sessions]) => ({
        page,
        sessions: sessions.length,
        totalTime: sessions.reduce((sum, time) => sum + time, 0),
        avgTime: sessions.reduce((sum, time) => sum + time, 0) / sessions.length
      }))
      .filter(entry => (entry.totalTime / 60) >= minTime)

    // Sort data
    filteredEntries.sort((a, b) => {
      switch (sortByAnalytics) {
        case 'sessions': return b.sessions - a.sessions
        case 'page': return a.page.localeCompare(b.page)
        case 'time':
        default: return b.totalTime - a.totalTime
      }
    })

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#00c6ff] mb-1">{(totalTime / 60).toFixed(1)}m</div>
            <div className="text-sm text-white/70">Total Time</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#00c6ff] mb-1">{totalSessions}</div>
            <div className="text-sm text-white/70">Total Sessions</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#00c6ff] mb-1">{uniquePages}</div>
            <div className="text-sm text-white/70">Unique Pages</div>
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Page</th>
              <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Sessions</th>
              <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Total Time</th>
              <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Avg Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length > 0 ? (
              filteredEntries.map(entry => (
                <tr key={entry.page} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3">
                    <span className="inline-block bg-white/5 px-2 py-1 rounded text-sm font-mono">
                      {entry.page}
                    </span>
                  </td>
                  <td className="p-3">{entry.sessions}</td>
                  <td className="p-3"><strong>{(entry.totalTime / 60).toFixed(1)} min</strong></td>
                  <td className="p-3">{(entry.avgTime / 60).toFixed(1)} min</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-white/60">No data matches the current filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </>
    )
  }, [minTime, sortByAnalytics])

  const renderAuditLogs = useCallback(async () => {
    const { logs, idToUsername } = await fetchAuditLogs()
    
    // Apply filters
    const filtered = logs.filter(log =>
      (!filterAdmin || log.admin_name?.toLowerCase().includes(filterAdmin.toLowerCase())) &&
      (!filterAction || log.action?.toLowerCase().includes(filterAction.toLowerCase())) &&
      (!filterDesc || log.description?.toLowerCase().includes(filterDesc.toLowerCase())) &&
      (!filterTarget || idToUsername[log.target_discord_id || '']?.toLowerCase().includes(filterTarget.toLowerCase()))
    )
    
    return (
      <>
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Admin</th>
              <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Action</th>
              <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Description</th>
              <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Target</th>
              <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map(log => {
                const statusClass = getStatusClass(log.action)
                return (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3"><strong>{log.admin_name}</strong></td>
                    <td className="p-3">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${statusClass}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3">{log.description}</td>
                    <td className="p-3">{idToUsername[log.target_discord_id || ''] || 'N/A'}</td>
                    <td className="p-3">{log.created_at ? formatDate(log.created_at) : 'N/A'}</td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-white/60">No logs match the current filters</td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div className="flex justify-center items-center gap-4 mt-6">
          <button 
            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setLogsPage(prev => Math.max(0, prev - 1))}
            disabled={logsPage === 0}
          >
            ← Previous
          </button>
          <span>Page {logsPage + 1}</span>
          <button 
            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setLogsPage(prev => prev + 1)}
            disabled={filtered.length < logsLimit}
          >
            Next →
          </button>
        </div>
      </>
    )
  }, [fetchAuditLogs, filterAdmin, filterAction, filterDesc, filterTarget, logsPage, logsLimit, formatDate])

  // Get status class for audit log
  const getStatusClass = useCallback((action: string | null) => {
    const actionLower = action?.toLowerCase() || ''
    
    if (actionLower.includes('whitelist')) 
      return 'bg-green-500/20 text-green-400 border border-green-500/30'
    if (actionLower.includes('revoke') || actionLower.includes('ban')) 
      return 'bg-red-500/20 text-red-400 border border-red-500/30'
    if (actionLower.includes('trial')) 
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
    
    return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  }, [])

  // Show blueprint popup
  const showBlueprintPopup = useCallback((blueprints: Blueprint[]) => {
    // Filter out components (first 22 items)
    const displayList = blueprints.slice(22).map(bp => bp.blueprint_name)
    
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#1e1e1e] rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Selected Blueprints</h3>
            <button 
              className="text-white/70 hover:text-white"
              onClick={() => document.body.classList.remove('modal-open')}
            >
              ×
            </button>
          </div>
          
          {displayList.length > 0 ? (
            <ul className="space-y-2">
              {displayList.map((bp, index) => (
                <li key={index} className="p-2 border-b border-white/10">{bp}</li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-white/60 py-4">No blueprints selected</p>
          )}
        </div>
      </div>
    )
  }, [])

  // Prompt for custom trial duration
  const promptCustomTrial = useCallback((discordId: string) => {
    const days = prompt('Enter number of days for trial:')
    if (days && !isNaN(Number(days)) && parseInt(days) > 0) {
      updateTrialTime(discordId, parseInt(days))
    }
  }, [updateTrialTime])

  // Check if user is active
  const isUserActive = useCallback((user: User, period: string) => {
    if (!user.last_login) return false

    const loginDate = new Date(user.last_login)
    const now = new Date()
    const diffHours = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60)

    switch (period) {
      case '1h': return diffHours <= 1
      case '24h': return diffHours <= 24
      case '7d': return diffHours <= 168 // 7 * 24
      case '30d': return diffHours <= 720 // 30 * 24
      default: return false
    }
  }, [])

  // Calculate statistics
  const calculateStats = useCallback((users: User[]) => {
    const totalUsers = users.length
    const whitelistedUsers = users.filter(u => !u.revoked).length
    const revokedUsers = users.filter(u => u.revoked).length
    const trialUsers = users.filter(u =>
      u.hub_trial && u.trial_expiration && new Date(u.trial_expiration) > new Date()
    ).length
    const onlineCount = onlineUsers.size
    const totalLogins = users.reduce((sum, u) => sum + (u.login_count || 0), 0)
    const activeUsers = users.filter(u => isUserActive(u, '24h')).length

    return {
      totalUsers,
      whitelistedUsers,
      revokedUsers,
      trialUsers,
      onlineCount,
      totalLogins,
      activeUsers
    }
  }, [onlineUsers, isUserActive])

  // Calculate analytics statistics
  const calculateAnalyticsStats = useCallback((data: PageSession[]) => {
    const users = new Set(data.filter(d => d.username).map(d => d.username!))
    const totalSessions = data.length
    const totalTime = data.reduce((sum, row) => sum + (row.time_spent_seconds || 0), 0)
    const avgSessionTime = totalSessions > 0 ? totalTime / totalSessions : 0
    const uniquePages = new Set(data.map(row => row.page_path)).size

    return {
      totalUsers: users.size,
      totalSessions,
      avgSessionTime,
      uniquePages
    }
  }, [])

  if (loading || !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c6ff]"></div>
      </div>
    )
  }

  // Calculate stats for display
  const stats = calculateStats(allUsers)
  const analyticsStats = calculateAnalyticsStats(allPageData)

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className={`max-w-7xl mx-auto p-4 md:p-8 relative ${isPanelOpen ? 'mr-[400px] transition-all duration-300' : ''}`}>
        <Link href="/" className="inline-flex items-center gap-2 text-[#00c6ff] border border-[#00c6ff] rounded-md px-4 py-2 mb-4 hover:bg-[#00c6ff]/10 transition-colors">
          ← Back
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text w-full">
          Admin Dashboard
        </h1>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-6">
            {/* Add User Form */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input
                type="text"
                value={newDiscordId}
                onChange={(e) => setNewDiscordId(e.target.value)}
                placeholder="Enter Discord ID"
                className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
              />
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter Username"
                className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
              />
              <button
                onClick={addUser}
                disabled={isAddingUser}
                className="px-4 py-2 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingUser ? 'Adding...' : 'Whitelist User'}
              </button>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-4 py-2 bg-white/5 border border-[#00c6ff] text-[#00c6ff] rounded-lg hover:bg-[#00c6ff]/10 transition-colors"
              >
                {showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
              </button>
              
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchInput}
                placeholder="Search Discord ID, Username, or Email"
                className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
              />
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
              >
                <option value="last_login">Sort: Last Login</option>
                <option value="login_count">Sort: Login Count</option>
                <option value="username">Sort: Username</option>
                <option value="created_at">Sort: Date Added</option>
                <option value="trial_expiration">Sort: Trial Expiration</option>
              </select>
              
              <button
                onClick={() => loadUsers()}
                disabled={isLoading}
                className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-t-[#00c6ff] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    Loading...
                  </span>
                ) : 'Refresh'}
              </button>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white/5 rounded-lg mb-6">
                <div className="flex flex-col gap-2">
                  <label className="text-white/70 text-sm">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                  >
                    <option value="all">All Users</option>
                    <option value="whitelisted">Whitelisted</option>
                    <option value="revoked">Revoked</option>
                    <option value="trial">On Trial</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-white/70 text-sm">Login Activity</label>
                  <select
                    value={filterActivity}
                    onChange={(e) => setFilterActivity(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                  >
                    <option value="all">All Activity</option>
                    <option value="active_24h">Active 24h</option>
                    <option value="active_7d">Active 7d</option>
                    <option value="active_30d">Active 30d</option>
                    <option value="never_logged">Never Logged In</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-white/70 text-sm">Account Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                  >
                    <option value="all">All Types</option>
                    <option value="admin">Admins</option>
                    <option value="regular">Regular Users</option>
                    <option value="trial">Trial Users</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-white/70 text-sm">Date Range</label>
                  <select
                    value={filterDateRange}
                    onChange={(e) => setFilterDateRange(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                  </select>
                </div>
              </div>
            )}

            {/* Bulk Actions */}
            {selectedUsers.size > 0 && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-6">
                <h3 className="text-[#00c6ff] font-semibold mb-4">Bulk Actions ({selectedUsers.size} selected)</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={bulkWhitelist}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Whitelist Selected
                  </button>
                  <button
                    onClick={bulkRevoke}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Revoke Selected
                  </button>
                  <button
                    onClick={bulkAddTrial}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Add 7 Day Trial
                  </button>
                  <button
                    onClick={bulkDelete}
                    className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
                <div className="text-2xl text-[#00c6ff]">👥</div>
                <div>
                  <h3 className="text-xs text-white/70 uppercase tracking-wider">Total Users</h3>
                  <p className="text-xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
                <div className="text-2xl text-[#00c6ff]">⚡</div>
                <div>
                  <h3 className="text-xs text-white/70 uppercase tracking-wider">Online Now</h3>
                  <p className="text-xl font-bold">{stats.onlineCount}</p>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
                <div className="text-2xl text-[#00c6ff]">📈</div>
                <div>
                  <h3 className="text-xs text-white/70 uppercase tracking-wider">Total Logins</h3>
                  <p className="text-xl font-bold">{stats.totalLogins}</p>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
                <div className="text-2xl text-[#00c6ff]">🔒</div>
                <div>
                  <h3 className="text-xs text-white/70 uppercase tracking-wider">Revoked Users</h3>
                  <p className="text-xl font-bold">{stats.revokedUsers}</p>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
                <div className="text-2xl text-[#00c6ff]">🎯</div>
                <div>
                  <h3 className="text-xs text-white/70 uppercase tracking-wider">Trial Users</h3>
                  <p className="text-xl font-bold">{stats.trialUsers}</p>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-3">
                <div className="text-2xl text-[#00c6ff]">⏰</div>
                <div>
                  <h3 className="text-xs text-white/70 uppercase tracking-wider">Active Last 24h</h3>
                  <p className="text-xl font-bold">{stats.activeUsers}</p>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 sticky top-0">
                    <tr>
                      <th className="p-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 accent-[#00c6ff]"
                        />
                      </th>
                      <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Discord ID</th>
                      <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Username</th>
                      <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Added</th>
                      <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Last Login</th>
                      <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Login Count</th>
                      <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Status</th>
                      <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Trial</th>
                      <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Session</th>
                      <th className="p-3 text-left text-[#00c6ff] font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <tr 
                          key={user.discord_id} 
                          className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                          onClick={() => openUserPanel(user.discord_id)}
                        >
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.discord_id)}
                              onChange={() => toggleUserSelection(user.discord_id)}
                              className="w-4 h-4 accent-[#00c6ff]"
                            />
                          </td>
                          <td className="p-3">
                            {user.discord_id}
                            {ADMIN_DISCORD_IDS.includes(user.discord_id) && (
                              <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-gradient-to-r from-yellow-400 to-yellow-600 text-black">
                                ADMIN
                              </span>
                            )}
                          </td>
                          <td className="p-3">{user.username || 'N/A'}</td>
                          <td className="p-3">{formatDate(user.created_at)}</td>
                          <td className="p-3">{user.last_login ? formatDate(user.last_login) : 'Never'}</td>
                          <td className="p-3">{user.login_count || 0}</td>
                          <td className="p-3">
                            <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                              user.revoked 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}>
                              {user.revoked ? 'REVOKED' : 'ACCESS'}
                            </span>
                          </td>
                          <td className="p-3">
                            {getTrialStatus(user)}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                              onlineUsers.has(user.discord_id)
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {onlineUsers.has(user.discord_id) ? 'ONLINE' : 'OFFLINE'}
                            </span>
                          </td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            {renderActionButtons(user)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-white/60">
                          {isLoading ? 'Loading users...' : 'No users match the current filters'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">{analyticsStats.totalUsers}</div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Active Users</div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">{analyticsStats.totalSessions}</div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Total Sessions</div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">
                  {(analyticsStats.avgSessionTime / 60).toFixed(1)}m
                </div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Avg Session Time</div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1">{analyticsStats.uniquePages}</div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Unique Pages</div>
              </div>
            </div>

            {/* Top Pages and User Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-[#00c6ff] mb-4">
                  Top Pages by Time Spent
                </h2>
                
                <div className="flex items-center gap-4 mb-4">
                  <select
                    value={pagesLimit}
                    onChange={(e) => setPagesLimit(Number(e.target.value))}
                    className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                  >
                    <option value={10}>Top 10</option>
                    <option value={15}>Top 15</option>
                    <option value={25}>Top 25</option>
                  </select>
                </div>
                
                <div className="overflow-x-auto">
                  {renderTopPages(allPageData)}
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-[#00c6ff] mb-4">
                  User Page Analytics
                </h2>
                
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <select
                    value={selectedAnalyticsUser}
                    onChange={(e) => setSelectedAnalyticsUser(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                  >
                    <option value="">Select a user...</option>
                    {Object.keys(userPageData).sort().map(username => (
                      <option key={username} value={username}>{username}</option>
                    ))}
                  </select>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-white/70 whitespace-nowrap">Min time:</label>
                    <input
                      type="number"
                      value={minTime}
                      onChange={(e) => setMinTime(Number(e.target.value))}
                      placeholder="0"
                      min="0"
                      className="w-20 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                    />
                    <span className="text-white/70">minutes</span>
                  </div>
                  
                  <select
                    value={sortByAnalytics}
                    onChange={(e) => setSortByAnalytics(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                  >
                    <option value="time">Sort by Time</option>
                    <option value="sessions">Sort by Sessions</option>
                    <option value="page">Sort by Page</option>
                  </select>
                </div>
                
                <div className="overflow-x-auto">
                  {renderUserTable(userPageData, selectedAnalyticsUser)}
                </div>
              </div>
            </div>

            {/* Admin Audit Logs */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-[#00c6ff] mb-4">
                Admin Audit Logs
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <input
                  value={filterAdmin}
                  onChange={(e) => setFilterAdmin(e.target.value)}
                  placeholder="Admin name"
                  className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                />
                
                <input
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  placeholder="Action"
                  className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                />
                
                <input
                  value={filterDesc}
                  onChange={(e) => setFilterDesc(e.target.value)}
                  placeholder="Description"
                  className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                />
                
                <input
                  value={filterTarget}
                  onChange={(e) => setFilterTarget(e.target.value)}
                  placeholder="Target Username"
                  className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                />
                
                <select
                  value={logsLimit}
                  onChange={(e) => {
                    setLogsLimit(Number(e.target.value))
                    setLogsPage(0)
                  }}
                  className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#00c6ff]"
                >
                  <option value={15}>15 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              
              <div className="overflow-x-auto">
                {renderAuditLogs()}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Status Message */}
        {statusMessage.type && (
          <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
            statusMessage.type === 'success' ? 'bg-green-500/90' :
            statusMessage.type === 'error' ? 'bg-red-500/90' :
            'bg-blue-500/90'
          }`}>
            {statusMessage.message}
          </div>
        )}
      </div>

      {/* User Details Side Panel */}
      <div className={`fixed top-0 right-0 w-[400px] h-full bg-[#1a1a1a] border-l border-white/10 overflow-y-auto transition-all duration-300 transform ${
        isPanelOpen ? 'translate-x-0' : 'translate-x-full'
      } z-50`}>
        {selectedUser && (
          <>
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-[#00c6ff]">User Details</h2>
              <button
                onClick={closeSidePanel}
                className="text-white/70 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-[#00c6ff] mb-4">User Information</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Discord ID:</span>
                  <span className="font-semibold">{selectedUser.discord_id}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Username:</span>
                  <span className="font-semibold">{selectedUser.username || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Status:</span>
                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                    selectedUser.revoked 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>
                    {selectedUser.revoked ? 'REVOKED' : 'ACCESS'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Account Type:</span>
                  <span>
                    {ADMIN_DISCORD_IDS.includes(selectedUser.discord_id) ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-gradient-to-r from-yellow-400 to-yellow-600 text-black">
                        ADMIN
                      </span>
                    ) : 'Regular User'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Created:</span>
                  <span className="font-semibold">{formatDate(selectedUser.created_at)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Last Login:</span>
                  <span className="font-semibold">
                    {selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Login Count:</span>
                  <span className="font-semibold">{selectedUser.login_count || 0}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Trial Status:</span>
                  <span>{getTrialStatus(selectedUser)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Session:</span>
                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                    onlineUsers.has(selectedUser.discord_id)
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {onlineUsers.has(selectedUser.discord_id) ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-white/70">Blueprints:</span>
                  <span className="font-semibold">
                    {Math.max(0, userBlueprints.length - 22)} Selected
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-[#00c6ff] mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => updateUserStatus(selectedUser.discord_id, !selectedUser.revoked)}
                  className={`w-full py-2 px-4 rounded-lg font-semibold ${
                    selectedUser.revoked 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-red-500 text-white hover:bg-red-600'
                  } transition-colors`}
                >
                  {selectedUser.revoked ? 'Whitelist User' : 'Revoke Access'}
                </button>
                
                <button
                  onClick={() => updateTrialTime(selectedUser.discord_id, 7)}
                  className="w-full py-2 px-4 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
                >
                  Add 7 Day Trial
                </button>
                
                <button
                  onClick={() => updateTrialTime(selectedUser.discord_id, 30)}
                  className="w-full py-2 px-4 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
                >
                  Add 30 Day Trial
                </button>
                
                <button
                  onClick={() => promptCustomTrial(selectedUser.discord_id)}
                  className="w-full py-2 px-4 bg-[#00c6ff] text-black rounded-lg font-semibold hover:bg-[#00a9db] transition-colors"
                >
                  Custom Trial Duration
                </button>
                
                {/* New feature: Convert trial to permanent whitelist */}
                {selectedUser.hub_trial && selectedUser.trial_expiration && (
                  <button
                    onClick={() => convertTrialToPermanent(selectedUser.discord_id)}
                    className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-colors"
                  >
                    Convert Trial to Permanent
                  </button>
                )}
                
                <button
                  onClick={() => deleteUser(selectedUser.discord_id)}
                  className="w-full py-2 px-4 bg-red-700 text-white rounded-lg font-semibold hover:bg-red-800 transition-colors"
                >
                  Delete User
                </button>
                
                <button
                  onClick={() => showBlueprintPopup(userBlueprints)}
                  className="w-full py-2 px-4 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors"
                >
                  Show Blueprints
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <h3 className="text-lg font-semibold text-[#00c6ff] mb-4">Audit Log</h3>
              
              <div className="max-h-[300px] overflow-y-auto bg-black/20 rounded-lg p-4">
                {auditLogs
                  .filter(log => !log.target_discord_id || log.target_discord_id === selectedUser.discord_id)
                  .slice(0, 20)
                  .map(log => (
                    <div key={log.id} className="flex items-start gap-4 py-3 border-b border-white/5 last:border-b-0">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        log.action?.includes('whitelist') ? 'bg-green-500' :
                        log.action?.includes('revoke') ? 'bg-red-500' :
                        log.action?.includes('delete') ? 'bg-red-700' :
                        log.action?.includes('trial') ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <div className="font-semibold">{log.description}</div>
                        <div className="text-white/70 text-sm">by {log.admin_name}</div>
                        <div className="text-white/50 text-xs mt-1">
                          {log.created_at ? formatRelativeTime(new Date(log.created_at)) : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                
                {auditLogs.filter(log => !log.target_discord_id || log.target_discord_id === selectedUser.discord_id).length === 0 && (
                  <div className="text-center text-white/50 py-4">No audit logs for this user</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}