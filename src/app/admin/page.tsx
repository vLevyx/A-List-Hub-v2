'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { usePageTracking } from '@/hooks/usePageTracking'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'

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

export default function AdminPage() {
  usePageTracking()
  const router = useRouter()
  const { user, loading } = useAuth()
  const supabase = createClient()

  // Admin IDs
  const ADMIN_DISCORD_IDS = [
    '154388953053659137',
    '344637470908088322',
    '796587763851198474',
    '492053410967846933',
    '487476487386038292'
  ]

  // State - Users
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [sessionHeartbeats, setSessionHeartbeats] = useState<Map<string, number>>(new Map())
  const [showSidePanel, setShowSidePanel] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showBlueprintPopup, setShowBlueprintPopup] = useState(false)
  const [userBlueprints, setUserBlueprints] = useState<string[]>([])

  // State - Analytics
  const [pageSessionData, setPageSessionData] = useState<PageSession[]>([])
  const [userPageData, setUserPageData] = useState<Record<string, Record<string, number[]>>>({})
  const [selectedAnalyticsUser, setSelectedAnalyticsUser] = useState<string>('')
  const [minTime, setMinTime] = useState<number>(0)
  const [sortBy, setSortBy] = useState<string>('time')
  const [pagesLimit, setPagesLimit] = useState<number>(15)

  // State - Audit Logs
  const [auditLogs, setAuditLogs] = useState<AdminLog[]>([])
  const [logsPage, setLogsPage] = useState<number>(0)
  const [logsLimit, setLogsLimit] = useState<number>(15)
  const [filterAdmin, setFilterAdmin] = useState<string>('')
  const [filterAction, setFilterAction] = useState<string>('')
  const [filterDesc, setFilterDesc] = useState<string>('')
  const [filterTarget, setFilterTarget] = useState<string>('')

  // Refs
  const realtimeSubscriptionRef = useRef<any>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check if user is admin
  const isAdmin = useCallback(() => {
    if (!user) return false
    const discordId = user.user_metadata?.provider_id || user.user_metadata?.sub
    return ADMIN_DISCORD_IDS.includes(discordId)
  }, [user, ADMIN_DISCORD_IDS])

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin()) {
      router.push('/')
    }
  }, [loading, isAdmin, router])

  // Initialize
  useEffect(() => {
    if (!loading && isAdmin()) {
      loadUsers()
      setupRealtimeUpdates()
      setupSessionTracking()
      trackUserSessions()
      startHeartbeatMonitoring()
      loadAuditLogs()
      fetchPageSessions()
    }

    return () => {
      // Clean up
      if (realtimeSubscriptionRef.current) {
        realtimeSubscriptionRef.current.unsubscribe()
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [loading, isAdmin])

  // Setup realtime updates
  const setupRealtimeUpdates = useCallback(() => {
    realtimeSubscriptionRef.current = supabase
      .channel('users_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => handleRealtimeUpdate(payload)
      )
      .subscribe()
  }, [supabase])

  // Handle realtime update
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('Real-time update:', payload)

    switch (payload.eventType) {
      case 'INSERT':
        setAllUsers(prev => [...prev, payload.new])
        logAuditEvent('create', `User ${payload.new.username || payload.new.discord_id} added`, payload.new.discord_id)
        break
      case 'UPDATE':
        setAllUsers(prev => prev.map(u => u.discord_id === payload.new.discord_id ? payload.new : u))
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

  // Session tracking
  const setupSessionTracking = useCallback(() => {
    // Create sessions table for tracking online users
    trackUserSessions()
  }, [])

  const trackUserSessions = useCallback(async () => {
    try {
      // Get current sessions from users who logged in within the last 5 minutes
      const { data: recentLogins } = await supabase
        .from('users')
        .select('discord_id, last_login, username')
        .gte('last_login', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes

      if (recentLogins) {
        // Clear existing online users first
        const newOnlineUsers = new Set<string>()
        const newSessionHeartbeats = new Map<string, number>()

        recentLogins.forEach(user => {
          newOnlineUsers.add(user.discord_id)
          newSessionHeartbeats.set(user.discord_id, Date.now())
        })

        setOnlineUsers(newOnlineUsers)
        setSessionHeartbeats(newSessionHeartbeats)

        // Refresh the table display
        applyFiltersAndSort()
      }
    } catch (error) {
      console.error('Session tracking error:', error)
    }
  }, [supabase])

  const startHeartbeatMonitoring = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      const now = Date.now()
      const timeout = 10 * 60 * 1000 // 10 minutes timeout

      setSessionHeartbeats(prev => {
        const newHeartbeats = new Map(prev)
        const newOnlineUsers = new Set(onlineUsers)

        for (const [userId, lastSeen] of prev.entries()) {
          if (now - lastSeen > timeout) {
            newHeartbeats.delete(userId)
            newOnlineUsers.delete(userId)
          }
        }

        setOnlineUsers(newOnlineUsers)
        return newHeartbeats
      })

      updateStats()
      applyFiltersAndSort() // Refresh table to show status changes
    }, 15000) // Check every 15 seconds
  }, [onlineUsers])

  // Audit logging
  const logAuditEvent = useCallback(async (action: string, description: string, userId: string | null = null) => {
    try {
      const session = await supabase.auth.getSession()
      const adminId = session?.data?.session?.user?.user_metadata?.provider_id
      const adminName = session?.data?.session?.user?.user_metadata?.full_name || 'Unknown'

      const { error } = await supabase.from('admin_logs').insert([{
        action,
        description,
        admin_id: adminId,
        admin_name: adminName,
        target_discord_id: userId,
        created_at: new Date().toISOString()
      }])

      if (error) throw error

      // Optionally re-fetch logs so UI stays fresh
      loadAuditLogs()

    } catch (err) {
      console.error('Failed to log audit event:', err)
    }
  }, [supabase])

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

  // Data loading and management
  const loadUsers = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)
    setIsRefreshing(true)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setAllUsers(data || [])
      applyFiltersAndSort()
      updateStats()

    } catch (error) {
      console.error('Error loading users:', error)
      showToast('Failed to load users', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [isLoading, supabase])

  // User management functions
  const addUser = useCallback(async () => {
    const discordIdInput = document.getElementById('newDiscordId') as HTMLInputElement
    const usernameInput = document.getElementById('newUsername') as HTMLInputElement
    
    const discordId = discordIdInput?.value.trim()
    const username = usernameInput?.value.trim()

    if (!discordId) {
      showToast('Discord ID is required', 'error')
      return
    }

    if (allUsers.some(u => u.discord_id === discordId)) {
      showToast('User already exists', 'info')
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          discord_id: discordId,
          username: username || null,
          revoked: false,
          created_at: new Date().toISOString()
        }])
        .select()

      if (error) throw error

      if (discordIdInput) discordIdInput.value = ''
      if (usernameInput) usernameInput.value = ''

      showToast('User whitelisted successfully', 'success')
      logAuditEvent('whitelist', `User ${username || discordId} whitelisted`, discordId)

    } catch (error) {
      console.error('Error adding user:', error)
      showToast('Failed to whitelist user', 'error')
    }
  }, [allUsers, supabase, logAuditEvent])

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

      // Ensure all views reflect the update instantly
      await Promise.all([
        trackUserSessions(), // Update "Online" badge state
        loadUsers()          // Reload table & stats
      ])

      // Optionally update the open side panel if user is visible
      if (selectedUser?.discord_id === discordId) {
        setSelectedUser(allUsers.find(u => u.discord_id === discordId) || null)
        renderUserPanel()
      }

    } catch (error) {
      console.error('Error updating user status:', error)
      showToast('Failed to update user status', 'error')
    }
  }, [allUsers, supabase, logAuditEvent, selectedUser, trackUserSessions, loadUsers])

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

      const user = allUsers.find(u => u.discord_id === discordId)
      showToast(`Trial extended by ${days} days`, 'success')
      logAuditEvent('trial', `${days} Day Trial action performed`, discordId)

      // Ensure all views reflect the update instantly
      await Promise.all([
        trackUserSessions(), // Update "Online" badge state
        loadUsers()          // Reload table & stats
      ])

      // Optionally update the open side panel if user is visible
      if (selectedUser?.discord_id === discordId) {
        setSelectedUser(allUsers.find(u => u.discord_id === discordId) || null)
        renderUserPanel()
      }

    } catch (error) {
      console.error('Error updating trial:', error)
      showToast('Failed to update trial', 'error')
    }
  }, [allUsers, supabase, logAuditEvent, selectedUser, trackUserSessions, loadUsers])

  const convertTrialToLifetime = useCallback(async (discordId: string) => {
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

      showToast('User converted to lifetime access', 'success')
      logAuditEvent('whitelist', 'Trial converted to lifetime access', discordId)

      // Ensure all views reflect the update instantly
      await Promise.all([
        trackUserSessions(),
        loadUsers()
      ])

      // Update the open side panel if user is visible
      if (selectedUser?.discord_id === discordId) {
        setSelectedUser(allUsers.find(u => u.discord_id === discordId) || null)
        renderUserPanel()
      }

    } catch (error) {
      console.error('Error converting trial to lifetime:', error)
      showToast('Failed to convert trial to lifetime', 'error')
    }
  }, [allUsers, supabase, logAuditEvent, selectedUser, trackUserSessions, loadUsers])

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

      // Close side panel if the deleted user was selected
      if (selectedUser?.discord_id === discordId) {
        setShowSidePanel(false)
        setSelectedUser(null)
      }

    } catch (error) {
      console.error('Error deleting user:', error)
      showToast('Failed to delete user', 'error')
    }
  }, [allUsers, supabase, logAuditEvent, selectedUser])

  // Bulk operations
  const bulkWhitelist = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'info')
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
  }, [selectedUsers, supabase, logAuditEvent])

  const bulkRevoke = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'info')
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
  }, [selectedUsers, supabase, logAuditEvent])

  const bulkAddTrial = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'info')
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
  }, [selectedUsers, supabase, logAuditEvent])

  const bulkDelete = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('No users selected', 'info')
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
  }, [selectedUsers, supabase, logAuditEvent])

  const clearSelection = useCallback(() => {
    setSelectedUsers(new Set())
    const selectAllCheckbox = document.getElementById('selectAll') as HTMLInputElement
    if (selectAllCheckbox) selectAllCheckbox.checked = false
    
    document.querySelectorAll('.user-checkbox').forEach(cb => {
      (cb as HTMLInputElement).checked = false
    })
    
    updateBulkActions()
  }, [])

  const updateBulkActions = useCallback(() => {
    const selectedCount = document.getElementById('selectedCount')
    if (selectedCount) {
      selectedCount.textContent = selectedUsers.size.toString()
    }

    const bulkActions = document.getElementById('bulkActions')
    if (bulkActions) {
      bulkActions.classList.toggle('show', selectedUsers.size > 0)
    }
  }, [selectedUsers.size])

  // Filtering and sorting
  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...allUsers]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(user =>
        user.discord_id.toLowerCase().includes(term) ||
        (user.username && user.username.toLowerCase().includes(term))
      )
    }

    // Apply status filter
    const statusFilter = (document.getElementById('filterStatus') as HTMLSelectElement)?.value
    if (statusFilter && statusFilter !== 'all') {
      switch (statusFilter) {
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
    const activityFilter = (document.getElementById('filterActivity') as HTMLSelectElement)?.value
    if (activityFilter && activityFilter !== 'all') {
      const now = new Date()
      switch (activityFilter) {
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
    const typeFilter = (document.getElementById('filterType') as HTMLSelectElement)?.value
    if (typeFilter && typeFilter !== 'all') {
      switch (typeFilter) {
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
    const dateFilter = (document.getElementById('filterDateRange') as HTMLSelectElement)?.value
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date()
      let startDate: Date | undefined

      switch (dateFilter) {
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
    const sortBy = (document.getElementById('sortBy') as HTMLSelectElement)?.value || 'last_login'
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
  }, [allUsers, searchTerm, ADMIN_DISCORD_IDS])

  // Analytics functions
  const fetchPageSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("page_sessions")
        .select("page_path, time_spent_seconds, username")
        .not("time_spent_seconds", "is", null)

      if (error) throw error

      // Process data for statistics
      const sessions = data || []
      const totals: Record<string, number> = {}
      const users: Record<string, Record<string, number[]>> = {}
      const pageCounts: Record<string, number> = {}

      sessions.forEach(row => {
        // Page totals
        if (!totals[row.page_path]) {
          totals[row.page_path] = 0
          pageCounts[row.page_path] = 0
        }
        totals[row.page_path] += row.time_spent_seconds || 0
        pageCounts[row.page_path]++

        // User data
        if (row.username) {
          if (!users[row.username]) users[row.username] = {}
          if (!users[row.username][row.page_path]) users[row.username][row.page_path] = []
          users[row.username][row.page_path].push(row.time_spent_seconds || 0)
        }
      })

      setPageSessionData(sessions)
      setUserPageData(users)
      updateAnalyticsStats(sessions, users)
      renderTopPages(totals, pageCounts)
      populateUserSelect(users)

    } catch (error) {
      console.error('Error fetching page sessions:', error)
    }
  }, [supabase])

  const updateAnalyticsStats = useCallback((data: any[], users: Record<string, any>) => {
    const totalUsers = Object.keys(users).length
    const totalSessions = data.length
    const totalTime = data.reduce((sum, row) => sum + (row.time_spent_seconds || 0), 0)
    const avgSessionTime = totalSessions > 0 ? totalTime / totalSessions : 0
    const uniquePages = new Set(data.map(row => row.page_path)).size

    // Update DOM elements
    const elements = {
      'total-users': totalUsers,
      'total-sessions': totalSessions,
      'avg-session-time': `${(avgSessionTime / 60).toFixed(1)}m`,
      'total-pages': uniquePages
    }

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id)
      if (element) element.textContent = value.toString()
    })
  }, [])

  const renderTopPages = useCallback((totals: Record<string, number>, pageCounts: Record<string, number>) => {
    const limit = pagesLimit
    const sorted = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)

    const tbody = document.querySelector("#top-pages-table tbody")
    if (tbody) {
      tbody.innerHTML = sorted.map(([page, time], index) => `
        <tr>
          <td><strong>#${index + 1}</strong></td>
          <td><span class="page-path">${page}</span></td>
          <td><strong>${(time / 60).toFixed(1)} min</strong></td>
          <td>${pageCounts[page]} sessions</td>
        </tr>
      `).join("")
    }
  }, [pagesLimit])

  const populateUserSelect = useCallback((users: Record<string, any>) => {
    const select = document.getElementById('user-select') as HTMLSelectElement
    if (!select) return
    
    const currentValue = select.value

    select.innerHTML = '<option value="">Select a user...</option>' +
      Object.keys(users)
        .sort()
        .map(username => `<option value="${username}">${username}</option>`)
        .join("")

    if (currentValue && users[currentValue]) {
      select.value = currentValue
    }
  }, [])

  const renderUserTable = useCallback((userData: Record<string, number[]> | undefined, username: string) => {
    const userStats = document.getElementById('user-stats')
    const tbody = document.querySelector("#user-pages-table tbody")
    
    if (!userStats || !tbody || !userData || !username) {
      if (userStats) userStats.style.display = 'none'
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Select a user to view their page analytics</td></tr>'
      return
    }

    // Calculate user statistics
    const entries = Object.entries(userData)
    const totalSessions = entries.reduce((sum, [, sessions]) => sum + sessions.length, 0)
    const totalTime = entries.reduce((sum, [, sessions]) => sum + sessions.reduce((s, t) => s + t, 0), 0)
    const uniquePages = entries.length

    // Update user stats display
    const userTotalTime = document.getElementById('user-total-time')
    const userTotalSessions = document.getElementById('user-total-sessions')
    const userUniquePages = document.getElementById('user-unique-pages')
    
    if (userTotalTime) userTotalTime.textContent = `${(totalTime / 60).toFixed(1)}m`
    if (userTotalSessions) userTotalSessions.textContent = totalSessions.toString()
    if (userUniquePages) userUniquePages.textContent = uniquePages.toString()
    if (userStats) userStats.style.display = 'block'

    // Filter and sort data
    const minTimeValue = minTime
    const sortByValue = sortBy

    let filteredEntries = entries
      .map(([page, sessions]) => ({
        page,
        sessions: sessions.length,
        totalTime: sessions.reduce((sum, time) => sum + time, 0),
        avgTime: sessions.reduce((sum, time) => sum + time, 0) / sessions.length
      }))
      .filter(entry => (entry.totalTime / 60) >= minTimeValue)

    // Sort data
    filteredEntries.sort((a, b) => {
      switch (sortByValue) {
        case 'sessions': return b.sessions - a.sessions
        case 'page': return a.page.localeCompare(b.page)
        case 'time':
        default: return b.totalTime - a.totalTime
      }
    })

    tbody.innerHTML = filteredEntries.length > 0
      ? filteredEntries.map(entry => `
          <tr>
            <td><span class="page-path">${entry.page}</span></td>
            <td>${entry.sessions}</td>
            <td><strong>${(entry.totalTime / 60).toFixed(1)} min</strong></td>
            <td>${(entry.avgTime / 60).toFixed(1)} min</td>
          </tr>
        `).join("")
      : '<tr><td colspan="4" class="empty-state">No data matches the current filters</td></tr>'
  }, [minTime, sortBy])

  const fetchAuditLogs = useCallback(async () => {
    try {
      const limit = logsLimit
      const offset = logsPage * logsLimit

      const { data: logs, error } = await supabase
        .from("admin_logs")
        .select("*, target_discord_id")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      const discordIds = [...new Set(logs.map(log => log.target_discord_id).filter(Boolean))]
      const { data: users } = await supabase
        .from("users")
        .select("discord_id, username")
        .in("discord_id", discordIds)

      const idToUsername = Object.fromEntries((users || []).map(u => [u.discord_id, u.username]))

      const filters = {
        admin: filterAdmin.toLowerCase(),
        action: filterAction.toLowerCase(),
        desc: filterDesc.toLowerCase(),
        target: filterTarget.toLowerCase(),
      }

      const filtered = logs.filter(log =>
        (!filters.admin || (log.admin_name?.toLowerCase() || '').includes(filters.admin)) &&
        (!filters.action || (log.action?.toLowerCase() || '').includes(filters.action)) &&
        (!filters.desc || (log.description?.toLowerCase() || '').includes(filters.desc)) &&
        (!filters.target || (idToUsername[log.target_discord_id]?.toLowerCase() || '').includes(filters.target))
      )

      const tbody = document.querySelector("#audit-log-table tbody")
      if (tbody) {
        tbody.innerHTML = filtered.length > 0
          ? filtered.map(log => {
            const actionLower = (log.action || '').toLowerCase()
            let statusClass = ''
            
            if (actionLower.includes('whitelist')) statusClass = 'status-whitelisted'
            else if (actionLower.includes('revoke') || actionLower.includes('ban')) statusClass = 'status-revoked'
            else if (actionLower.includes('trial')) statusClass = 'status-trial'
            
            return `
              <tr>
                <td><strong>${log.admin_name || 'Unknown'}</strong></td>
                <td><span class="status-badge ${statusClass}">${log.action || 'Unknown'}</span></td>
                <td>${log.description || 'No description'}</td>
                <td>${idToUsername[log.target_discord_id] || 'N/A'}</td>
                <td>${new Date(log.created_at || '').toLocaleString()}</td>
              </tr>
            `
          }).join("")
          : '<tr><td colspan="5" class="empty-state">No logs match the current filters</td></tr>'
      }

      // Update pagination
      const pageInfo = document.getElementById('page-info')
      const prevLogBtn = document.getElementById('prev-log') as HTMLButtonElement
      const nextLogBtn = document.getElementById('next-log') as HTMLButtonElement
      
      if (pageInfo) pageInfo.textContent = `Page ${logsPage + 1}`
      if (prevLogBtn) prevLogBtn.disabled = logsPage === 0
      if (nextLogBtn) nextLogBtn.disabled = filtered.length < logsLimit

    } catch (error) {
      console.error('Error fetching audit logs:', error)
    }
  }, [supabase, logsLimit, logsPage, filterAdmin, filterAction, filterDesc, filterTarget])

  // User panel
  const openUserPanel = useCallback((discordId: string) => {
    const user = allUsers.find(u => u.discord_id === discordId)
    if (!user) return

    setSelectedUser(user)
    renderUserPanel()
    setShowSidePanel(true)
  }, [allUsers])

  const renderUserPanel = useCallback(async () => {
    if (!selectedUser) return

    const userInfoPanel = document.getElementById('userInfoPanel')
    const actionButtons = document.getElementById('actionButtons')
    
    if (!userInfoPanel || !actionButtons) return

    // Get blueprints for user
    const blueprints = await getBlueprints(selectedUser.discord_id)
    setUserBlueprints(blueprints)

    // User info with better spacing
    userInfoPanel.innerHTML = `
      <h3>User Information</h3>
      <div class="info-item">
        <span class="info-label">Discord ID:</span>
        <span class="info-value">${selectedUser.discord_id}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Username:</span>
        <span class="info-value">${selectedUser.username || 'N/A'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Status:</span>
        <span class="info-value">
          <span class="status-badge status-${selectedUser.revoked ? 'revoked' : 'whitelisted'}">
            ${selectedUser.revoked ? 'REVOKED' : 'ACCESS'}
          </span>
        </span>
      </div>
      <div class="info-item">
        <span class="info-label">Account Type:</span>
        <span class="info-value">
          ${ADMIN_DISCORD_IDS.includes(selectedUser.discord_id) ?
            '<span class="admin-badge">ADMIN</span>' : 'Regular User'}
        </span>
      </div>
      <div class="info-item">
        <span class="info-label">Created:</span>
        <span class="info-value">${formatDate(selectedUser.created_at)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Last Login:</span>
        <span class="info-value">${selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Login Count:</span>
        <span class="info-value">${selectedUser.login_count || 0}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Trial Status:</span>
        <span class="info-value">${getTrialStatus(selectedUser)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Session:</span>
        <span class="info-value">
          <span class="status-badge status-${onlineUsers.has(selectedUser.discord_id) ? 'online' : 'offline'}">
            ${onlineUsers.has(selectedUser.discord_id) ? 'ONLINE' : 'OFFLINE'}
          </span>
        </span>
      </div>
      <div class="info-item">
        <span class="info-label">Blueprints:</span>
        <span class="info-value">${Math.max(0, blueprints.length - 22)} Selected</span>
      </div>
    `

    // Action buttons
    actionButtons.innerHTML = `
      <button class="action-btn action-${selectedUser.revoked ? 'success' : 'danger'}" 
              onclick="document.dispatchEvent(new CustomEvent('updateUserStatus', { detail: { discordId: '${selectedUser.discord_id}', revoked: ${!selectedUser.revoked} } }))">
        ${selectedUser.revoked ? 'Whitelist User' : 'Revoke Access'}
      </button>
      <button class="action-btn action-warning" 
              style="background: #ffc107; color: #000;"
              onclick="document.dispatchEvent(new CustomEvent('updateTrialTime', { detail: { discordId: '${selectedUser.discord_id}', days: 7 } }))">
        Add 7 Day Trial
      </button>
      <button class="action-btn action-warning" 
              style="background: #ffc107; color: #000;"
              onclick="document.dispatchEvent(new CustomEvent('updateTrialTime', { detail: { discordId: '${selectedUser.discord_id}', days: 30 } }))">
        Add 30 Day Trial
      </button>
      ${selectedUser.hub_trial && selectedUser.trial_expiration && new Date(selectedUser.trial_expiration) > new Date() ? `
        <button class="action-btn action-primary" 
                onclick="document.dispatchEvent(new CustomEvent('convertTrialToLifetime', { detail: { discordId: '${selectedUser.discord_id}' } }))">
          Convert Trial to Lifetime
        </button>
      ` : ''}
      <button class="action-btn action-primary" 
              onclick="document.dispatchEvent(new CustomEvent('promptCustomTrial', { detail: { discordId: '${selectedUser.discord_id}' } }))">
        Custom Trial Duration
      </button>
      <button class="action-btn action-danger" 
              onclick="document.dispatchEvent(new CustomEvent('deleteUser', { detail: { discordId: '${selectedUser.discord_id}' } }))">
        Delete User
      </button>
      <button class="action-btn action-secondary"
              onclick="document.dispatchEvent(new CustomEvent('showBlueprints', { detail: { discordId: '${selectedUser.discord_id}' } }))">
        Show Blueprints
      </button>
    `

    updateAuditLogDisplay()
  }, [selectedUser, ADMIN_DISCORD_IDS, onlineUsers])

  const updateAuditLogDisplay = useCallback(() => {
    const auditLogContainer = document.getElementById('auditLog')
    if (!auditLogContainer || !selectedUser) return

    const userLogs = auditLogs
      .filter(log => !log.target_discord_id || log.target_discord_id === selectedUser.discord_id)
      .slice(0, 20)

    auditLogContainer.innerHTML = userLogs.map(log => {
      const actionLower = (log.action || '').toLowerCase()
      let iconClass = ''
      
      if (actionLower.includes('whitelist')) iconClass = 'whitelist'
      else if (actionLower.includes('revoke')) iconClass = 'revoke'
      else if (actionLower.includes('delete')) iconClass = 'delete'
      else if (actionLower.includes('trial')) iconClass = 'trial'
      else if (actionLower.includes('bulk_whitelist')) iconClass = 'bulk_whitelist'
      else if (actionLower.includes('bulk_revoke')) iconClass = 'bulk_revoke'
      else if (actionLower.includes('bulk_delete')) iconClass = 'bulk_delete'
      else if (actionLower.includes('bulk_trial')) iconClass = 'bulk_trial'
      
      return `
        <div class="audit-entry">
          <div class="audit-icon ${iconClass}"></div>
          <div class="audit-content">
            <div class="audit-action">${log.description || 'No description'}</div>
            <div class="audit-details">by ${log.admin_name || 'Unknown'}</div>
            <div class="audit-time">${formatRelativeTime(new Date(log.created_at || ''))}</div>
          </div>
        </div>
      `
    }).join('')
  }, [auditLogs, selectedUser])

  const promptCustomTrial = useCallback((discordId: string) => {
    const days = prompt('Enter number of days for trial:')
    if (days && !isNaN(Number(days)) && parseInt(days) > 0) {
      updateTrialTime(discordId, parseInt(days))
    }
  }, [updateTrialTime])

  // Blueprint functions
  const getBlueprints = useCallback(async (discordId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_blueprints')
        .select('blueprint_name')
        .eq('discord_id', discordId)

      if (error) throw error
      return data ? data.map(bp => bp.blueprint_name) : []
    } catch (error) {
      console.error('Error fetching blueprints:', error)
      return []
    }
  }, [supabase])

  // Selection management
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
    
    updateBulkActions()
    updateSelectAllCheckbox()
  }, [])

  const toggleSelectAll = useCallback(() => {
    const selectAll = document.getElementById('selectAll') as HTMLInputElement
    const checkboxes = document.querySelectorAll('.user-checkbox') as NodeListOf<HTMLInputElement>

    if (selectAll.checked) {
      const newSelected = new Set<string>()
      filteredUsers.forEach(user => {
        newSelected.add(user.discord_id)
      })
      setSelectedUsers(newSelected)
      checkboxes.forEach(cb => cb.checked = true)
    } else {
      setSelectedUsers(new Set())
      checkboxes.forEach(cb => cb.checked = false)
    }
    
    updateBulkActions()
  }, [filteredUsers])

  const updateSelectAllCheckbox = useCallback(() => {
    const selectAll = document.getElementById('selectAll') as HTMLInputElement
    if (!selectAll) return

    const visibleUsers = filteredUsers.length
    const selectedVisibleUsers = filteredUsers.filter(user =>
      selectedUsers.has(user.discord_id)
    ).length

    selectAll.checked = visibleUsers > 0 && selectedVisibleUsers === visibleUsers
    selectAll.indeterminate = selectedVisibleUsers > 0 && selectedVisibleUsers < visibleUsers
  }, [filteredUsers, selectedUsers])

  // Statistics and updates
  const updateStats = useCallback(() => {
    const totalUsers = allUsers.length
    const whitelistedUsers = allUsers.filter(u => !u.revoked).length
    const revokedUsers = allUsers.filter(u => u.revoked).length
    const trialUsers = allUsers.filter(u =>
      u.hub_trial && u.trial_expiration && new Date(u.trial_expiration) > new Date()
    ).length
    const onlineCount = onlineUsers.size
    const totalLogins = allUsers.reduce((sum, u) => sum + (u.login_count || 0), 0)
    const activeUsers = allUsers.filter(u => isUserActive(u, '24h')).length

    // Update dashboard stats
    updateStatElement('totalUsers', totalUsers)
    updateStatElement('whitelistedUsers', whitelistedUsers)
    updateStatElement('revokedUsers', revokedUsers)
    updateStatElement('trialUsers', trialUsers)
    updateStatElement('onlineUsers', onlineCount)
    updateStatElement('totalLogins', totalLogins)
    updateStatElement('activeUsers', activeUsers)

    // Update table info
    const filteredCount = filteredUsers.length
    const tableInfo = document.getElementById('tableInfo')
    if (tableInfo) {
      tableInfo.textContent = `Showing ${filteredCount} of ${totalUsers} users`
    }
  }, [allUsers, onlineUsers.size, filteredUsers.length])

  const updateStatElement = useCallback((id: string, value: number | string) => {
    const element = document.getElementById(id)
    if (element) {
      element.textContent = value.toString()
    }
  }, [])

  // Utility functions
  const formatDate = useCallback((dateString: string) => {
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

  const getTrialStatus = useCallback((user: User) => {
    if (!user.hub_trial) return 'N/A'

    if (!user.trial_expiration) {
      return '<span class="trial-badge">TRIAL</span>'
    }

    const expiration = new Date(user.trial_expiration)
    const now = new Date()

    if (expiration > now) {
      const daysLeft = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return `<span class="trial-badge" style="white-space: nowrap;" title="Trial expires in ${daysLeft} days">TRIAL (${daysLeft}d)</span>`
    } else {
      return '<span class="status-badge status-revoked">EXPIRED</span>'
    }
  }, [])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer')
    if (!toastContainer) {
      toastContainer = document.createElement('div')
      toastContainer.id = 'toastContainer'
      toastContainer.className = 'toast-container'
      document.body.appendChild(toastContainer)
    }

    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
        <span class="toast-message">${message}</span>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `

    toastContainer.appendChild(toast)

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove()
      }
    }, 5000)
  }, [])

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

  // Event handlers
  useEffect(() => {
    // Custom event listeners for user panel actions
    const updateUserStatusHandler = (e: CustomEvent) => {
      const { discordId, revoked } = e.detail
      updateUserStatus(discordId, revoked)
    }

    const updateTrialTimeHandler = (e: CustomEvent) => {
      const { discordId, days } = e.detail
      updateTrialTime(discordId, days)
    }

    const convertTrialToLifetimeHandler = (e: CustomEvent) => {
      const { discordId } = e.detail
      convertTrialToLifetime(discordId)
    }

    const promptCustomTrialHandler = (e: CustomEvent) => {
      const { discordId } = e.detail
      promptCustomTrial(discordId)
    }

    const deleteUserHandler = (e: CustomEvent) => {
      const { discordId } = e.detail
      deleteUser(discordId)
    }

    const showBlueprintsHandler = (e: CustomEvent) => {
      const { discordId } = e.detail
      setShowBlueprintPopup(true)
    }

    document.addEventListener('updateUserStatus', updateUserStatusHandler as EventListener)
    document.addEventListener('updateTrialTime', updateTrialTimeHandler as EventListener)
    document.addEventListener('convertTrialToLifetime', convertTrialToLifetimeHandler as EventListener)
    document.addEventListener('promptCustomTrial', promptCustomTrialHandler as EventListener)
    document.addEventListener('deleteUser', deleteUserHandler as EventListener)
    document.addEventListener('showBlueprints', showBlueprintsHandler as EventListener)

    // Analytics event listeners
    const userSelectElement = document.getElementById('user-select') as HTMLSelectElement
    const minTimeElement = document.getElementById('min-time') as HTMLInputElement
    const sortByElement = document.getElementById('sort-by') as HTMLSelectElement
    const pagesLimitElement = document.getElementById('pages-limit') as HTMLSelectElement
    
    if (userSelectElement) {
      userSelectElement.addEventListener('change', (e) => {
        setSelectedAnalyticsUser((e.target as HTMLSelectElement).value)
      })
    }
    
    if (minTimeElement) {
      minTimeElement.addEventListener('input', (e) => {
        setMinTime(parseFloat((e.target as HTMLInputElement).value) || 0)
      })
    }
    
    if (sortByElement) {
      sortByElement.addEventListener('change', (e) => {
        setSortBy((e.target as HTMLSelectElement).value)
      })
    }
    
    if (pagesLimitElement) {
      pagesLimitElement.addEventListener('change', (e) => {
        setPagesLimit(parseInt((e.target as HTMLSelectElement).value))
      })
    }

    // Audit log event listeners
    const prevLogBtn = document.getElementById('prev-log')
    const nextLogBtn = document.getElementById('next-log')
    const logsLimitElement = document.getElementById('logs-limit') as HTMLSelectElement
    const filterAdminElement = document.getElementById('filter-admin') as HTMLInputElement
    const filterActionElement = document.getElementById('filter-action') as HTMLInputElement
    const filterDescElement = document.getElementById('filter-desc') as HTMLInputElement
    const filterTargetElement = document.getElementById('filter-target') as HTMLInputElement
    
    if (prevLogBtn) {
      prevLogBtn.addEventListener('click', () => {
        if (logsPage > 0) {
          setLogsPage(logsPage - 1)
        }
      })
    }
    
    if (nextLogBtn) {
      nextLogBtn.addEventListener('click', () => {
        setLogsPage(logsPage + 1)
      })
    }
    
    if (logsLimitElement) {
      logsLimitElement.addEventListener('change', (e) => {
        setLogsLimit(parseInt((e.target as HTMLSelectElement).value))
        setLogsPage(0)
      })
    }
    
    if (filterAdminElement) {
      filterAdminElement.addEventListener('input', (e) => {
        setFilterAdmin((e.target as HTMLInputElement).value)
        setLogsPage(0)
      })
    }
    
    if (filterActionElement) {
      filterActionElement.addEventListener('input', (e) => {
        setFilterAction((e.target as HTMLInputElement).value)
        setLogsPage(0)
      })
    }
    
    if (filterDescElement) {
      filterDescElement.addEventListener('input', (e) => {
        setFilterDesc((e.target as HTMLInputElement).value)
        setLogsPage(0)
      })
    }
    
    if (filterTargetElement) {
      filterTargetElement.addEventListener('input', (e) => {
        setFilterTarget((e.target as HTMLInputElement).value)
        setLogsPage(0)
      })
    }

    return () => {
      document.removeEventListener('updateUserStatus', updateUserStatusHandler as EventListener)
      document.removeEventListener('updateTrialTime', updateTrialTimeHandler as EventListener)
      document.removeEventListener('convertTrialToLifetime', convertTrialToLifetimeHandler as EventListener)
      document.removeEventListener('promptCustomTrial', promptCustomTrialHandler as EventListener)
      document.removeEventListener('deleteUser', deleteUserHandler as EventListener)
      document.removeEventListener('showBlueprints', showBlueprintsHandler as EventListener)
    }
  }, [
    updateUserStatus, 
    updateTrialTime, 
    convertTrialToLifetime,
    promptCustomTrial, 
    deleteUser, 
    logsPage
  ])

  // Effects for analytics
  useEffect(() => {
    renderUserTable(userPageData[selectedAnalyticsUser], selectedAnalyticsUser)
  }, [selectedAnalyticsUser, minTime, sortBy, userPageData, renderUserTable])

  useEffect(() => {
    const totals: Record<string, number> = {}
    const pageCounts: Record<string, number> = {}
    
    pageSessionData.forEach(row => {
      if (!totals[row.page_path]) {
        totals[row.page_path] = 0
        pageCounts[row.page_path] = 0
      }
      totals[row.page_path] += row.time_spent_seconds || 0
      pageCounts[row.page_path]++
    })
    
    renderTopPages(totals, pageCounts)
  }, [pagesLimit, pageSessionData, renderTopPages])

  // Effects for audit logs
  useEffect(() => {
    fetchAuditLogs()
  }, [logsPage, logsLimit, filterAdmin, filterAction, filterDesc, filterTarget, fetchAuditLogs])

  // Effects for filtering and sorting
  useEffect(() => {
    applyFiltersAndSort()
  }, [searchTerm, applyFiltersAndSort])

  // Render table
  const renderTable = useCallback(() => {
    const tbody = document.querySelector('#usersTable tbody')
    if (!tbody) return

    tbody.innerHTML = filteredUsers.map(user => `
      <tr data-user-id="${user.discord_id}" onclick="document.dispatchEvent(new CustomEvent('openUserPanel', { detail: '${user.discord_id}' }))">
        <td onclick="event.stopPropagation();">
          <input
            type="checkbox"
            class="user-checkbox"
            onchange="event.stopPropagation(); document.dispatchEvent(new CustomEvent('toggleUserSelection', { detail: '${user.discord_id}' }))"
            ${selectedUsers.has(user.discord_id) ? 'checked' : ''}>
        </td>
        <td>
          ${highlightSearchTerm(user.discord_id)}
          ${ADMIN_DISCORD_IDS.includes(user.discord_id) ? '<span class="admin-badge">ADMIN</span>' : ''}
        </td>
        <td>${highlightSearchTerm(user.username || 'N/A')}</td>
        <td>${formatDate(user.created_at)}</td>
        <td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td>
        <td>${user.login_count || 0}</td>
        <td>
          <span class="status-badge status-${user.revoked ? 'revoked' : 'whitelisted'}">
            ${user.revoked ? 'REVOKED' : 'ACCESS'}
          </span>
        </td>
        <td>
          ${getTrialStatus(user)}
        </td>
        <td>
          <span class="status-badge status-${onlineUsers.has(user.discord_id) ? 'online' : 'offline'}">
            ${onlineUsers.has(user.discord_id) ? 'ONLINE' : 'OFFLINE'}
          </span>
        </td>
        <td onclick="event.stopPropagation()">
          <div class="dropdown">
            <button class="hamburger-icon" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('show')">
              ☰
            </button>
            <div class="dropdown-content">
              <button onclick="event.stopPropagation(); document.dispatchEvent(new CustomEvent('updateUserStatus', { detail: { discordId: '${user.discord_id}', revoked: ${!user.revoked} } }))">
                ${user.revoked ? 'Whitelist' : 'Revoke'}
              </button>
              <button onclick="event.stopPropagation(); document.dispatchEvent(new CustomEvent('deleteUser', { detail: { discordId: '${user.discord_id}' } }))" class="delete-action">
                Delete
              </button>
            </div>
          </div>
        </td>
      </tr>
    `).join('')
  }, [filteredUsers, selectedUsers, ADMIN_DISCORD_IDS, onlineUsers, formatDate, getTrialStatus, highlightSearchTerm])

  // Highlight search term in text
  const highlightSearchTerm = useCallback((text: string) => {
    if (!searchTerm || !text) return text
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    return text.replace(regex, '<span class="search-highlight">$1</span>')
  }, [searchTerm])

  // Event handlers for custom events
  useEffect(() => {
    const openUserPanelHandler = (e: CustomEvent) => {
      openUserPanel(e.detail)
    }

    const toggleUserSelectionHandler = (e: CustomEvent) => {
      toggleUserSelection(e.detail)
    }

    document.addEventListener('openUserPanel', openUserPanelHandler as EventListener)
    document.addEventListener('toggleUserSelection', toggleUserSelectionHandler as EventListener)

    return () => {
      document.removeEventListener('openUserPanel', openUserPanelHandler as EventListener)
      document.removeEventListener('toggleUserSelection', toggleUserSelectionHandler as EventListener)
    }
  }, [openUserPanel, toggleUserSelection])

  // Update table when filtered users change
  useEffect(() => {
    renderTable()
  }, [filteredUsers, renderTable])

  if (loading || !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c6ff]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121212] text-[#f0f0f0] p-4 md:p-8">
      <div className={`max-w-[1600px] mx-auto bg-[rgba(30,30,30,0.9)] rounded-xl p-4 md:p-8 border border-white/5 shadow-2xl relative transition-all ${showSidePanel ? 'mr-[400px]' : ''}`} id="mainContainer">
        <Link href="/" className="inline-flex items-center gap-2 bg-transparent text-[#00c6ff] border border-[#00c6ff] rounded-md px-4 py-2 text-sm font-semibold hover:bg-[rgba(0,198,255,0.1)] transition-all mb-4">
          ← Back
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold text-center text-[#00c6ff] mb-8">Admin Dashboard</h1>

        <Tabs defaultValue="users">
          <TabsList className="mb-8">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input 
                type="text" 
                id="newDiscordId" 
                placeholder="Enter Discord ID"
                className="flex-1 p-3 bg-white/5 border border-white/20 rounded-lg text-white"
              />
              <input 
                type="text" 
                id="newUsername" 
                placeholder="Enter Username"
                className="flex-1 p-3 bg-white/5 border border-white/20 rounded-lg text-white"
              />
              <button 
                onClick={addUser} 
                id="addUserBtn"
                className="px-6 py-3 bg-[#00c6ff] text-black font-bold rounded-lg hover:bg-[#00a9db] transition-all"
              >
                Whitelist User
              </button>
            </div>

            <button 
              className="px-4 py-2 bg-transparent text-[#00c6ff] border border-[#00c6ff] rounded-md text-sm font-semibold hover:bg-[rgba(0,198,255,0.1)] transition-all mb-6"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
            </button>

            <div className={`bg-white/[0.02] rounded-xl p-4 md:p-6 border border-white/5 mb-6 transition-all ${showAdvancedFilters ? 'block' : 'hidden'}`} id="advancedFilters">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-white/70 text-sm">Status</label>
                  <select 
                    id="filterStatus" 
                    onChange={() => applyFiltersAndSort()}
                    className="p-3 bg-[#2a2a2a] border border-white/20 rounded-lg text-white"
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
                    id="filterActivity" 
                    onChange={() => applyFiltersAndSort()}
                    className="p-3 bg-[#2a2a2a] border border-white/20 rounded-lg text-white"
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
                    id="filterType" 
                    onChange={() => applyFiltersAndSort()}
                    className="p-3 bg-[#2a2a2a] border border-white/20 rounded-lg text-white"
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
                    id="filterDateRange" 
                    onChange={() => applyFiltersAndSort()}
                    className="p-3 bg-[#2a2a2a] border border-white/20 rounded-lg text-white"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input 
                type="text" 
                id="searchInput" 
                placeholder="Search Discord ID, Username, or Email"
                className="flex-1 p-3 bg-white/5 border border-white/20 rounded-lg text-white"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select 
                id="sortBy" 
                onChange={() => applyFiltersAndSort()}
                className="p-3 bg-[#2a2a2a] border border-white/20 rounded-lg text-white"
              >
                <option value="last_login">Sort: Last Login</option>
                <option value="login_count">Sort: Login Count</option>
                <option value="username">Sort: Username</option>
                <option value="created_at">Sort: Date Added</option>
                <option value="trial_expiration">Sort: Trial Expiration</option>
              </select>
              <button 
                onClick={loadUsers} 
                id="refreshBtn"
                disabled={isRefreshing}
                className="px-6 py-3 bg-[#00c6ff] text-black font-bold rounded-lg hover:bg-[#00a9db] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRefreshing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-transparent border-t-black border-l-black rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </>
                ) : 'Refresh'}
              </button>
            </div>

            <div className={`bg-white/[0.02] rounded-xl p-4 md:p-6 border border-white/5 mb-6 ${selectedUsers.size > 0 ? 'block' : 'hidden'}`} id="bulkActions">
              <h3 className="text-[#00c6ff] text-lg font-semibold mb-4">Bulk Actions (<span id="selectedCount">0</span> selected)</h3>
              <div className="flex flex-wrap gap-3">
                <button 
                  className="px-4 py-2 bg-[#10b981] text-white rounded-lg hover:bg-[#0d9668] transition-all text-sm font-medium"
                  onClick={bulkWhitelist}
                >
                  Whitelist Selected
                </button>
                <button 
                  className="px-4 py-2 bg-[#ff4c4c] text-white rounded-lg hover:bg-[#e63939] transition-all text-sm font-medium"
                  onClick={bulkRevoke}
                >
                  Revoke Selected
                </button>
                <button 
                  className="px-4 py-2 bg-[#ffc107] text-black rounded-lg hover:bg-[#e5ac00] transition-all text-sm font-medium"
                  onClick={bulkAddTrial}
                >
                  Add 7 Day Trial
                </button>
                <button 
                  className="px-4 py-2 bg-[#ff4c4c] text-white rounded-lg hover:bg-[#e63939] transition-all text-sm font-medium"
                  onClick={bulkDelete}
                >
                  Delete Selected
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 flex items-center gap-4 transition-all hover:bg-white/[0.06] hover:border-white/10">
                <div className="text-2xl text-[#00c6ff]">👥</div>
                <div>
                  <h3 className="text-[#00c6ff] text-xs uppercase tracking-wider mb-1">Total Users</h3>
                  <p className="text-xl font-bold text-white" id="totalUsers">—</p>
                </div>
              </div>
              
              <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 flex items-center gap-4 transition-all hover:bg-white/[0.06] hover:border-white/10">
                <div className="text-2xl text-[#00c6ff]">⚡</div>
                <div>
                  <h3 className="text-[#00c6ff] text-xs uppercase tracking-wider mb-1">Online Now</h3>
                  <p className="text-xl font-bold text-white" id="onlineUsers">—</p>
                </div>
              </div>
              
              <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 flex items-center gap-4 transition-all hover:bg-white/[0.06] hover:border-white/10">
                <div className="text-2xl text-[#00c6ff]">📈</div>
                <div>
                  <h3 className="text-[#00c6ff] text-xs uppercase tracking-wider mb-1">Total Logins</h3>
                  <p className="text-xl font-bold text-white" id="totalLogins">—</p>
                </div>
              </div>
              
              <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 flex items-center gap-4 transition-all hover:bg-white/[0.06] hover:border-white/10">
                <div className="text-2xl text-[#00c6ff]">🔒</div>
                <div>
                  <h3 className="text-[#00c6ff] text-xs uppercase tracking-wider mb-1">Revoked Users</h3>
                  <p className="text-xl font-bold text-white" id="revokedUsers">—</p>
                </div>
              </div>
              
              <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 flex items-center gap-4 transition-all hover:bg-white/[0.06] hover:border-white/10">
                <div className="text-2xl text-[#00c6ff]">🎯</div>
                <div>
                  <h3 className="text-[#00c6ff] text-xs uppercase tracking-wider mb-1">Trial Users</h3>
                  <p className="text-xl font-bold text-white" id="trialUsers">—</p>
                </div>
              </div>
              
              <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 flex items-center gap-4 transition-all hover:bg-white/[0.06] hover:border-white/10">
                <div className="text-2xl text-[#00c6ff]">⏰</div>
                <div>
                  <h3 className="text-[#00c6ff] text-xs uppercase tracking-wider mb-1">Active Last 24h</h3>
                  <p className="text-xl font-bold text-white" id="activeUsers">—</p>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.01] rounded-xl overflow-hidden border border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full" id="usersTable">
                  <thead>
                    <tr>
                      <th className="p-4 bg-white/[0.03] border-b-2 border-white/10">
                        <input 
                          type="checkbox" 
                          id="selectAll" 
                          onChange={toggleSelectAll}
                          className="w-5 h-5 rounded bg-white/10 border border-white/30 checked:bg-[#00c6ff] checked:border-[#00c6ff]"
                        />
                      </th>
                      <th className="p-4 bg-white/[0.03] border-b-2 border-white/10 text-left text-[#00c6ff] font-semibold">Discord ID</th>
                      <th className="p-4 bg-white/[0.03] border-b-2 border-white/10 text-left text-[#00c6ff] font-semibold">Username</th>
                      <th className="p-4 bg-white/[0.03] border-b-2 border-white/10 text-left text-[#00c6ff] font-semibold">Added</th>
                      <th className="p-4 bg-white/[0.03] border-b-2 border-white/10 text-left text-[#00c6ff] font-semibold">Last Login</th>
                      <th className="p-4 bg-white/[0.03] border-b-2 border-white/10 text-left text-[#00c6ff] font-semibold">Login Count</th>
                      <th className="p-4 bg-white/[0.03] border-b-2 border-white/10 text-left text-[#00c6ff] font-semibold">Status</th>
                      <th className="p-4 bg-white/[0.03] border-b-2 border-white/10 text-left text-[#00c6ff] font-semibold">Trial</th>
                      <th className="p-4 bg-white/[0.03] border-b-2 border-white/10 text-left text-[#00c6ff] font-semibold">Session</th>
                      <th className="p-4 bg-white/[0.03] border-b-2 border-white/10 text-left text-[#00c6ff] font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-white/50">
                          <div className="flex justify-center">
                            <div className="w-8 h-8 border-2 border-transparent border-t-[#00c6ff] border-l-[#00c6ff] rounded-full animate-spin"></div>
                          </div>
                          <div className="mt-2">Loading users...</div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-white/50">
                          No users found matching your criteria
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/[0.02] rounded-xl p-4 text-center border border-white/5 transition-all hover:bg-white/[0.04] hover:border-white/10">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1" id="total-users">0</div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Active Users</div>
              </div>
              
              <div className="bg-white/[0.02] rounded-xl p-4 text-center border border-white/5 transition-all hover:bg-white/[0.04] hover:border-white/10">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1" id="total-sessions">0</div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Total Sessions</div>
              </div>
              
              <div className="bg-white/[0.02] rounded-xl p-4 text-center border border-white/5 transition-all hover:bg-white/[0.04] hover:border-white/10">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1" id="avg-session-time">0m</div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Avg Session Time</div>
              </div>
              
              <div className="bg-white/[0.02] rounded-xl p-4 text-center border border-white/5 transition-all hover:bg-white/[0.04] hover:border-white/10">
                <div className="text-2xl font-bold text-[#00c6ff] mb-1" id="total-pages">0</div>
                <div className="text-xs text-white/70 uppercase tracking-wider">Unique Pages</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/[0.05] rounded-xl p-6 border border-white/10 transition-all hover:bg-white/[0.06] hover:border-white/15">
                <h2 className="text-xl font-semibold text-[#00c6ff] mb-4 flex items-center gap-2">
                  <span>Top Pages by Time Spent</span>
                  <span className="text-white">🏆</span>
                </h2>
                
                <div className="flex items-center gap-4 mb-4">
                  <select 
                    id="pages-limit"
                    className="p-2.5 bg-[#1c1c1c] border border-white/20 rounded-lg text-white"
                    value={pagesLimit}
                    onChange={(e) => setPagesLimit(parseInt(e.target.value))}
                  >
                    <option value={10}>Top 10</option>
                    <option value={15}>Top 15</option>
                    <option value={25}>Top 25</option>
                  </select>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full" id="top-pages-table">
                    <thead>
                      <tr>
                        <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Rank</th>
                        <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Page</th>
                        <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Total Time</th>
                        <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-white/50">Loading...</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white/[0.05] rounded-xl p-6 border border-white/10 transition-all hover:bg-white/[0.06] hover:border-white/15">
                <h2 className="text-xl font-semibold text-[#00c6ff] mb-4 flex items-center gap-2">
                  <span>User Page Analytics</span>
                  <span className="text-white">👤</span>
                </h2>
                
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <select 
                    id="user-select"
                    className="flex-1 p-2.5 bg-[#1c1c1c] border border-white/20 rounded-lg text-white"
                    value={selectedAnalyticsUser}
                    onChange={(e) => setSelectedAnalyticsUser(e.target.value)}
                  >
                    <option value="">Select a user...</option>
                  </select>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-white/70">Min time:</label>
                    <input 
                      type="number" 
                      id="min-time" 
                      placeholder="0" 
                      min="0" 
                      className="w-20 p-2.5 bg-[#1c1c1c] border border-white/20 rounded-lg text-white"
                      value={minTime}
                      onChange={(e) => setMinTime(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-white/70">minutes</span>
                  </div>
                  
                  <select 
                    id="sort-by"
                    className="p-2.5 bg-[#1c1c1c] border border-white/20 rounded-lg text-white"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="time">Sort by Time</option>
                    <option value="sessions">Sort by Sessions</option>
                    <option value="page">Sort by Page</option>
                  </select>
                </div>
                
                <div id="user-stats" className="hidden mb-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/5">
                      <div className="text-xl font-bold text-[#00c6ff]" id="user-total-time">0m</div>
                      <div className="text-xs text-white/70 uppercase tracking-wider">Total Time</div>
                    </div>
                    
                    <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/5">
                      <div className="text-xl font-bold text-[#00c6ff]" id="user-total-sessions">0</div>
                      <div className="text-xs text-white/70 uppercase tracking-wider">Total Sessions</div>
                    </div>
                    
                    <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/5">
                      <div className="text-xl font-bold text-[#00c6ff]" id="user-unique-pages">0</div>
                      <div className="text-xs text-white/70 uppercase tracking-wider">Unique Pages</div>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full" id="user-pages-table">
                    <thead>
                      <tr>
                        <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Page</th>
                        <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Sessions</th>
                        <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Total Time</th>
                        <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Avg Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-white/50">
                          Select a user to view their page analytics
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.05] rounded-xl p-6 border border-white/10 transition-all hover:bg-white/[0.06] hover:border-white/15">
              <h2 className="text-xl font-semibold text-[#00c6ff] mb-4 flex items-center gap-2">
                <span>Admin Audit Logs</span>
                <span className="text-white">📝</span>
              </h2>
              
              <div className="flex flex-wrap gap-3 mb-4">
                <input 
                  id="filter-admin" 
                  placeholder="Admin name" 
                  className="flex-1 min-w-[200px] p-2.5 bg-[#1c1c1c] border border-white/20 rounded-lg text-white"
                  value={filterAdmin}
                  onChange={(e) => setFilterAdmin(e.target.value)}
                />
                <input 
                  id="filter-action" 
                  placeholder="Action" 
                  className="flex-1 min-w-[200px] p-2.5 bg-[#1c1c1c] border border-white/20 rounded-lg text-white"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                />
                <input 
                  id="filter-desc" 
                  placeholder="Description" 
                  className="flex-1 min-w-[200px] p-2.5 bg-[#1c1c1c] border border-white/20 rounded-lg text-white"
                  value={filterDesc}
                  onChange={(e) => setFilterDesc(e.target.value)}
                />
                <input 
                  id="filter-target" 
                  placeholder="Target Username" 
                  className="flex-1 min-w-[200px] p-2.5 bg-[#1c1c1c] border border-white/20 rounded-lg text-white"
                  value={filterTarget}
                  onChange={(e) => setFilterTarget(e.target.value)}
                />
                <select 
                  id="logs-limit"
                  className="p-2.5 bg-[#1c1c1c] border border-white/20 rounded-lg text-white"
                  value={logsLimit}
                  onChange={(e) => setLogsLimit(parseInt(e.target.value))}
                >
                  <option value={15}>15 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full" id="audit-log-table">
                  <thead>
                    <tr>
                      <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Admin</th>
                      <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Action</th>
                      <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Description</th>
                      <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Target</th>
                      <th className="p-3 bg-[rgba(0,198,255,0.1)] text-left text-[#00c6ff] font-semibold border-b border-white/10">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-white/50">Loading...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-center items-center gap-4 mt-4">
                <button 
                  id="prev-log"
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => logsPage > 0 && setLogsPage(logsPage - 1)}
                  disabled={logsPage === 0}
                >
                  ← Previous
                </button>
                <span id="page-info" className="text-white/70">Page {logsPage + 1}</span>
                <button 
                  id="next-log"
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setLogsPage(logsPage + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Side Panel */}
      <div className={`fixed top-0 right-0 w-[400px] h-full bg-[rgba(20,20,20,0.98)] backdrop-blur-xl border-l border-white/10 z-50 overflow-y-auto p-8 transition-all duration-300 ${showSidePanel ? 'translate-x-0' : 'translate-x-full'}`} id="sidePanel">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
          <h2 className="text-2xl font-semibold text-[#00c6ff]">User Details</h2>
          <button 
            className="bg-transparent text-white/70 hover:text-white text-2xl border-none cursor-pointer"
            onClick={() => setShowSidePanel(false)}
          >
            ✕
          </button>
        </div>

        <div className="bg-white/[0.03] rounded-xl p-6 border border-white/5 mb-6" id="userInfoPanel">
          {/* User info will be populated here */}
        </div>

        <div className="bg-white/[0.02] rounded-xl p-6 border border-white/5 mb-6">
          <h3 className="text-lg font-semibold text-[#00c6ff] mb-4">Quick Actions</h3>
          <div className="space-y-3" id="actionButtons">
            {/* Action buttons will be populated here */}
          </div>
        </div>

        <div className="bg-white/[0.02] rounded-xl p-6 border border-white/5">
          <h3 className="text-lg font-semibold text-[#00c6ff] mb-4">Audit Log</h3>
          <div className="max-h-[300px] overflow-y-auto bg-black/20 rounded-lg p-4" id="auditLog">
            {/* Audit log will be populated here */}
          </div>
        </div>
      </div>

      {/* Blueprint Popup */}
      {showBlueprintPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#1e1e1e] rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[#00c6ff]">Selected Blueprints</h3>
              <button 
                className="text-white/70 hover:text-white text-2xl"
                onClick={() => setShowBlueprintPopup(false)}
              >
                ×
              </button>
            </div>
            
            <ul className="space-y-2">
              {userBlueprints.length > 0 ? (
                userBlueprints.map((bp, index) => (
                  <li key={index} className="py-2 border-b border-white/10 last:border-b-0">
                    {bp}
                  </li>
                ))
              ) : (
                <li className="py-4 text-center text-white/50">No blueprints selected</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Status badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-whitelisted {
          background: rgba(167, 243, 208, 0.2);
          color: #a7f3d0;
          border: 1px solid rgba(167, 243, 208, 0.3);
        }

        .status-revoked {
          background: rgba(255, 76, 76, 0.2);
          color: #ff4c4c;
          border: 1px solid rgba(255, 76, 76, 0.3);
        }

        .status-trial {
          background: rgba(255, 193, 7, 0.2);
          color: #ffc107;
          border: 1px solid rgba(255, 193, 7, 0.3);
        }

        .status-online {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .status-offline {
          background: rgba(107, 114, 128, 0.2);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }

        /* Admin badge */
        .admin-badge {
          display: inline-block;
          background: linear-gradient(45deg, #ffd700, #ffed4e);
          color: #000;
          padding: 0.2rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.7rem;
          font-weight: 700;
          margin-left: 0.5rem;
        }

        /* Trial badge */
        .trial-badge {
          display: inline-block;
          background: linear-gradient(45deg, #ffc107, #ff8f00);
          color: #000;
          padding: 0.2rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.7rem;
          font-weight: 700;
          white-space: nowrap;
        }

        /* Dropdown */
        .dropdown {
          position: relative;
          display: inline-block;
        }

        .dropdown-content {
          display: none;
          position: absolute;
          right: 0;
          background-color: #222;
          border: 1px solid #444;
          min-width: 120px;
          border-radius: 0.5rem;
          z-index: 1;
          overflow: hidden;
        }

        .dropdown-content.show {
          display: block;
        }

        .dropdown-content button {
          display: block;
          width: 100%;
          padding: 0.5rem 1rem;
          text-align: left;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .dropdown-content button:hover {
          background-color: #333;
        }

        .dropdown-content .delete-action {
          color: #ff4c4c;
        }

        /* Audit log icons */
        .audit-icon {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 0.5rem;
          flex-shrink: 0;
        }

        .audit-icon.whitelist,
        .audit-icon.bulk_whitelist {
          background-color: #22c55e;
        }

        .audit-icon.revoke,
        .audit-icon.bulk_revoke {
          background-color: #ef4444;
        }

        .audit-icon.delete,
        .audit-icon.bulk_delete {
          background-color: #dc2626;
        }

        .audit-icon.trial,
        .audit-icon.bulk_trial {
          background-color: #ffd700;
        }

        /* Toast */
        .toast {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          padding: 20px 30px;
          border-radius: 16px;
          background: rgba(25, 25, 25, 0.75);
          backdrop-filter: blur(12px);
          color: #e0e0e0;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
          z-index: 9999;
          opacity: 0.98;
          max-width: 90%;
          min-width: 250px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .toast.success {
          border-left: 4px solid #10b981;
        }

        .toast.error {
          border-left: 4px solid #ef4444;
        }

        .toast.info {
          border-left: 4px solid #3b82f6;
        }

        /* Search highlight */
        .search-highlight {
          background: rgba(0, 198, 255, 0.3);
          padding: 0.1rem 0.2rem;
          border-radius: 0.2rem;
        }

        /* Page path */
        .page-path {
          font-family: 'Courier New', monospace;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  )
}