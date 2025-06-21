'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePageTracking } from '@/hooks/usePageTracking'
import { createClient } from '@/lib/supabase/client'
import { getDiscordId, formatDate, timeAgo } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { RefreshCw, Search, UserPlus, UserMinus, Clock, Filter, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

// Admin IDs that have access
const ADMIN_DISCORD_IDS = [
  "154388953053659137",
  "344637470908088322",
  "796587763851198474",
  "492053410967846933",
  "487476487386038292"
]

// Types
interface User {
  id: string
  discord_id: string
  username: string | null
  created_at: string
  revoked: boolean | null
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

interface PageAnalytics {
  page_path: string
  time_spent_seconds: number
  username: string | null
  sessions: number
}

interface StatusMessage {
  type: 'success' | 'error' | 'info' | 'warning' | null
  message: string
}

export default function AdminPage() {
  usePageTracking()
  const router = useRouter()
  const { user, loading } = useAuth()
  const supabase = createClient()
  
  // State for users
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'whitelisted' | 'revoked' | 'trial'>('all')
  const [userPage, setUserPage] = useState(0)
  const [userLimit, setUserLimit] = useState(10)
  const [userCount, setUserCount] = useState(0)
  
  // State for logs
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [logPage, setLogPage] = useState(0)
  const [logLimit, setLogLimit] = useState(15)
  const [logCount, setLogCount] = useState(0)
  const [logFilters, setLogFilters] = useState({
    admin: '',
    action: '',
    target: ''
  })
  
  // State for analytics
  const [pageAnalytics, setPageAnalytics] = useState<PageAnalytics[]>([])
  const [topUsers, setTopUsers] = useState<{username: string, time_spent: number, sessions: number}[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [userPageAnalytics, setUserPageAnalytics] = useState<PageAnalytics[]>([])
  
  // UI state
  const [activeTab, setActiveTab] = useState('users')
  const [loadingState, setLoadingState] = useState({
    users: true,
    logs: true,
    analytics: true,
    action: false,
    refreshing: false
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({ type: null, message: '' })
  
  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef<boolean>(false)
  
  // Check if user is admin
  const checkAdminAccess = useCallback(() => {
    if (!user) return false
    
    const discordId = getDiscordId(user)
    return !!discordId && ADMIN_DISCORD_IDS.includes(discordId)
  }, [user])
  
  // Redirect if not admin
  useEffect(() => {
    if (!loading && !checkAdminAccess()) {
      router.push('/')
    }
  }, [loading, checkAdminAccess, router])
  
  // Load users with pagination and filtering
  const loadUsers = useCallback(async (page = 0, limit = 10, search = '', status = 'all') => {
    setLoadingState(prev => ({ ...prev, users: true }))
    
    try {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
      
      // Apply status filter
      if (status === 'whitelisted') {
        query = query.eq('revoked', false)
      } else if (status === 'revoked') {
        query = query.eq('revoked', true)
      } else if (status === 'trial') {
        query = query.eq('hub_trial', true)
      }
      
      // Apply search filter if provided
      if (search) {
        query = query.or(`username.ilike.%${search}%,discord_id.ilike.%${search}%`)
      }
      
      // Get count first
      const { count, error: countError } = await query
      
      if (countError) {
        console.error('Error getting user count:', countError)
        return
      }
      
      setUserCount(count || 0)
      
      // Then get paginated data
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(page * limit, (page * limit) + limit - 1)
      
      if (error) {
        console.error('Error loading users:', error)
        return
      }
      
      setUsers(data || [])
      setFilteredUsers(data || [])
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoadingState(prev => ({ ...prev, users: false }))
    }
  }, [supabase])
  
  // Load logs with pagination and filtering
  const loadLogs = useCallback(async (page = 0, limit = 15, filters = { admin: '', action: '', target: '' }) => {
    setLoadingState(prev => ({ ...prev, logs: true }))
    
    try {
      let query = supabase
        .from('admin_logs')
        .select('*', { count: 'exact' })
      
      // Apply filters
      if (filters.admin) {
        query = query.ilike('admin_name', `%${filters.admin}%`)
      }
      
      if (filters.action) {
        query = query.ilike('action', `%${filters.action}%`)
      }
      
      if (filters.target) {
        query = query.ilike('target_discord_id', `%${filters.target}%`)
      }
      
      // Get count first
      const { count, error: countError } = await query
      
      if (countError) {
        console.error('Error getting log count:', countError)
        return
      }
      
      setLogCount(count || 0)
      
      // Then get paginated data
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(page * limit, (page * limit) + limit - 1)
      
      if (error) {
        console.error('Error loading logs:', error)
        return
      }
      
      setLogs(data || [])
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setLoadingState(prev => ({ ...prev, logs: false }))
    }
  }, [supabase])
  
  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    setLoadingState(prev => ({ ...prev, analytics: true }))
    
    try {
      // Get page analytics
      const { data: pageData, error: pageError } = await supabase
        .from('page_sessions')
        .select('page_path, time_spent_seconds, username')
        .not('time_spent_seconds', 'is', null)
      
      if (pageError) {
        console.error('Error loading page analytics:', pageError)
        return
      }
      
      // Process page data
      const pageMap = new Map<string, { time: number, sessions: number, users: Set<string> }>()
      
      pageData?.forEach(session => {
        const path = session.page_path
        const time = session.time_spent_seconds || 0
        const username = session.username
        
        if (!pageMap.has(path)) {
          pageMap.set(path, { time: 0, sessions: 0, users: new Set() })
        }
        
        const entry = pageMap.get(path)!
        entry.time += time
        entry.sessions += 1
        if (username) entry.users.add(username)
      })
      
      // Convert to array and sort by time spent
      const pageAnalytics = Array.from(pageMap.entries()).map(([page_path, data]) => ({
        page_path,
        time_spent_seconds: data.time,
        sessions: data.sessions,
        username: null // Not used for aggregated data
      }))
      
      pageAnalytics.sort((a, b) => b.time_spent_seconds - a.time_spent_seconds)
      setPageAnalytics(pageAnalytics)
      
      // Process user data
      const userMap = new Map<string, { time_spent: number, sessions: number }>()
      
      pageData?.forEach(session => {
        if (!session.username) return
        
        if (!userMap.has(session.username)) {
          userMap.set(session.username, { time_spent: 0, sessions: 0 })
        }
        
        const entry = userMap.get(session.username)!
        entry.time_spent += session.time_spent_seconds || 0
        entry.sessions += 1
      })
      
      // Convert to array and sort by time spent
      const topUsers = Array.from(userMap.entries()).map(([username, data]) => ({
        username,
        time_spent: data.time_spent,
        sessions: data.sessions
      }))
      
      topUsers.sort((a, b) => b.time_spent - a.time_spent)
      setTopUsers(topUsers.slice(0, 10)) // Top 10 users
      
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoadingState(prev => ({ ...prev, analytics: false }))
    }
  }, [supabase])
  
  // Load user-specific page analytics
  const loadUserPageAnalytics = useCallback(async (username: string) => {
    if (!username) return
    
    try {
      const { data, error } = await supabase
        .from('page_sessions')
        .select('page_path, time_spent_seconds')
        .eq('username', username)
        .not('time_spent_seconds', 'is', null)
      
      if (error) {
        console.error('Error loading user page analytics:', error)
        return
      }
      
      // Process page data for this user
      const pageMap = new Map<string, { time: number, sessions: number }>()
      
      data?.forEach(session => {
        const path = session.page_path
        const time = session.time_spent_seconds || 0
        
        if (!pageMap.has(path)) {
          pageMap.set(path, { time: 0, sessions: 0 })
        }
        
        const entry = pageMap.get(path)!
        entry.time += time
        entry.sessions += 1
      })
      
      // Convert to array and sort by time spent
      const userPageAnalytics = Array.from(pageMap.entries()).map(([page_path, data]) => ({
        page_path,
        time_spent_seconds: data.time,
        sessions: data.sessions,
        username
      }))
      
      userPageAnalytics.sort((a, b) => b.time_spent_seconds - a.time_spent_seconds)
      setUserPageAnalytics(userPageAnalytics)
      
    } catch (error) {
      console.error('Failed to load user page analytics:', error)
    }
  }, [supabase])
  
  // Initialize data
  useEffect(() => {
    if (!loading && checkAdminAccess()) {
      loadUsers(userPage, userLimit, userSearch, userStatusFilter)
      loadLogs(logPage, logLimit, logFilters)
      loadAnalytics()
    }
  }, [loading, checkAdminAccess, loadUsers, loadLogs, loadAnalytics, userPage, userLimit, userSearch, userStatusFilter, logPage, logLimit, logFilters])
  
  // Load user page analytics when user is selected
  useEffect(() => {
    if (selectedUser) {
      loadUserPageAnalytics(selectedUser)
    } else {
      setUserPageAnalytics([])
    }
  }, [selectedUser, loadUserPageAnalytics])
  
  // Set up real-time subscriptions
  useEffect(() => {
    if (!checkAdminAccess()) return
    
    const usersChannel = supabase
      .channel('admin-users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadUsers(userPage, userLimit, userSearch, userStatusFilter)
      })
      .subscribe()
    
    const logsChannel = supabase
      .channel('admin-logs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_logs' }, () => {
        loadLogs(logPage, logLimit, logFilters)
      })
      .subscribe()
    
    const analyticsChannel = supabase
      .channel('admin-analytics-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_sessions' }, () => {
        // Don't reload analytics on every change to avoid excessive updates
        if (!isRefreshingRef.current) {
          isRefreshingRef.current = true
          
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current)
          }
          
          refreshTimeoutRef.current = setTimeout(() => {
            loadAnalytics()
            if (selectedUser) {
              loadUserPageAnalytics(selectedUser)
            }
            isRefreshingRef.current = false
          }, 5000) // Debounce analytics updates
        }
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(usersChannel)
      supabase.removeChannel(logsChannel)
      supabase.removeChannel(analyticsChannel)
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [checkAdminAccess, loadUsers, loadLogs, loadAnalytics, loadUserPageAnalytics, userPage, userLimit, userSearch, userStatusFilter, logPage, logLimit, logFilters, selectedUser, supabase])
  
  // Handle user search with debouncing
  const handleUserSearch = (value: string) => {
    setUserSearch(value)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setUserPage(0) // Reset to first page
      loadUsers(0, userLimit, value, userStatusFilter)
    }, 300)
  }
  
  // Handle log filters
  const handleLogFilterChange = (key: keyof typeof logFilters, value: string) => {
    setLogFilters(prev => ({ ...prev, [key]: value }))
    setLogPage(0) // Reset to first page
    loadLogs(0, logLimit, { ...logFilters, [key]: value })
  }
  
  // Format time in minutes and seconds
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (remainingSeconds === 0) return `${minutes}m`
    return `${minutes}m ${remainingSeconds}s`
  }
  
  // Admin actions
  const performUserAction = async (action: string, userId: string, username: string) => {
    if (!user) return
    
    setLoadingState(prev => ({ ...prev, action: true }))
    setStatusMessage({ type: null, message: '' })
    
    try {
      const adminId = getDiscordId(user)
      const adminName = user.user_metadata?.full_name || user.user_metadata?.name || 'Admin'
      
      if (!adminId) {
        throw new Error('Could not determine admin ID')
      }
      
      let description = ''
      let rpcFunction = ''
      let rpcParams: any = {}
      
      switch (action) {
        case 'WHITELIST':
          description = `Whitelisted user ${username}`
          rpcFunction = 'admin_whitelist_user'
          rpcParams = { target_discord_id: userId }
          break
          
        case 'REVOKE':
          description = `Revoked access for user ${username}`
          rpcFunction = 'admin_revoke_user'
          rpcParams = { target_discord_id: userId }
          break
          
        case 'TRIAL_7':
          description = `Added 7-day trial for user ${username}`
          rpcFunction = 'admin_add_trial'
          rpcParams = { target_discord_id: userId, days: 7 }
          break
          
        case 'TRIAL_30':
          description = `Added 30-day trial for user ${username}`
          rpcFunction = 'admin_add_trial'
          rpcParams = { target_discord_id: userId, days: 30 }
          break
          
        default:
          throw new Error('Invalid action')
      }
      
      // Create log entry
      const { error: logError } = await supabase
        .from('admin_logs')
        .insert([
          {
            admin_id: adminId,
            admin_name: adminName,
            action,
            target_discord_id: userId,
            description
          }
        ])
      
      if (logError) {
        throw logError
      }
      
      // Perform the action via RPC if needed
      if (rpcFunction) {
        const { error: rpcError } = await supabase.rpc(rpcFunction, rpcParams)
        
        if (rpcError) {
          throw rpcError
        }
      }
      
      // Show success message
      setStatusMessage({ 
        type: 'success', 
        message: `Successfully ${action.toLowerCase()}ed user ${username}` 
      })
      
      // Refresh data
      loadUsers(userPage, userLimit, userSearch, userStatusFilter)
      
    } catch (error) {
      console.error(`Error performing ${action}:`, error)
      setStatusMessage({ 
        type: 'error', 
        message: `Failed to ${action.toLowerCase()} user: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setLoadingState(prev => ({ ...prev, action: false }))
      
      // Clear status message after 3 seconds
      setTimeout(() => {
        setStatusMessage({ type: null, message: '' })
      }, 3000)
    }
  }
  
  // Refresh all data
  const refreshAllData = async () => {
    if (loadingState.refreshing) return
    
    setLoadingState(prev => ({ ...prev, refreshing: true }))
    
    try {
      await Promise.all([
        loadUsers(userPage, userLimit, userSearch, userStatusFilter),
        loadLogs(logPage, logLimit, logFilters),
        loadAnalytics()
      ])
      
      if (selectedUser) {
        await loadUserPageAnalytics(selectedUser)
      }
      
      setStatusMessage({ type: 'success', message: 'Data refreshed successfully' })
    } catch (error) {
      console.error('Error refreshing data:', error)
      setStatusMessage({ type: 'error', message: 'Failed to refresh data' })
    } finally {
      setLoadingState(prev => ({ ...prev, refreshing: false }))
      
      // Clear status message after 3 seconds
      setTimeout(() => {
        setStatusMessage({ type: null, message: '' })
      }, 3000)
    }
  }
  
  // If still loading auth or not admin, show loading state
  if (loading || !checkAdminAccess()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-white/70 animate-pulse">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] text-white p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text">
              Admin Dashboard
            </h1>
            <p className="text-white/60 mt-1">Manage users, view logs, and analyze usage</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 hover:text-white transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={16} />
              Back to Home
            </button>
            
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Features
            </button>
            
            <button
              onClick={refreshAllData}
              disabled={loadingState.refreshing}
              className="px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 rounded-lg text-primary-500 hover:text-primary-400 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingState.refreshing ? (
                <>
                  <LoadingSpinner size="xs" className="animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Refresh Data
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Status Message */}
        {statusMessage.type && (
          <div className={`mb-6 p-4 rounded-lg ${
            statusMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
            statusMessage.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
            statusMessage.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' :
            'bg-blue-500/10 border border-blue-500/30 text-blue-400'
          }`}>
            {statusMessage.message}
          </div>
        )}
        
        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="logs">Admin Logs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-xl p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-xl font-semibold text-primary-500">User Management</h2>
                
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <div className="relative flex-grow md:flex-grow-0 md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={16} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => handleUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                  
                  <select
                    value={userStatusFilter}
                    onChange={(e) => {
                      setUserStatusFilter(e.target.value as any)
                      setUserPage(0)
                      loadUsers(0, userLimit, userSearch, e.target.value as any)
                    }}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30"
                  >
                    <option value="all">All Users</option>
                    <option value="whitelisted">Whitelisted</option>
                    <option value="revoked">Revoked</option>
                    <option value="trial">Trial</option>
                  </select>
                  
                  <select
                    value={userLimit}
                    onChange={(e) => {
                      const newLimit = parseInt(e.target.value)
                      setUserLimit(newLimit)
                      setUserPage(0)
                      loadUsers(0, newLimit, userSearch, userStatusFilter)
                    }}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30"
                  >
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                  </select>
                </div>
              </div>
              
              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Discord ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Last Login</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loadingState.users ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center">
                          <div className="flex justify-center items-center">
                            <LoadingSpinner />
                            <span className="ml-3 text-white/70">Loading users...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                          No users found matching your criteria
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-medium">{user.username || 'Unknown'}</div>
                          </td>
                          <td className="px-4 py-4 font-mono text-xs text-white/70">
                            {user.discord_id}
                          </td>
                          <td className="px-4 py-4">
                            {user.revoked === false ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                Whitelisted
                              </span>
                            ) : user.hub_trial && user.trial_expiration && new Date(user.trial_expiration) > new Date() ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
                                Trial ({Math.ceil((new Date(user.trial_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}d)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                Revoked
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-white/70">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="px-4 py-4 text-sm text-white/70">
                            {user.last_login ? timeAgo(user.last_login) : 'Never'}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex space-x-2">
                              {user.revoked !== false && (
                                <button
                                  onClick={() => performUserAction('WHITELIST', user.discord_id, user.username || 'Unknown')}
                                  disabled={loadingState.action}
                                  className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium transition-colors"
                                >
                                  Whitelist
                                </button>
                              )}
                              
                              {user.revoked === false && (
                                <button
                                  onClick={() => performUserAction('REVOKE', user.discord_id, user.username || 'Unknown')}
                                  disabled={loadingState.action}
                                  className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-medium transition-colors"
                                >
                                  Revoke
                                </button>
                              )}
                              
                              {showAdvanced && (
                                <>
                                  <button
                                    onClick={() => performUserAction('TRIAL_7', user.discord_id, user.username || 'Unknown')}
                                    disabled={loadingState.action}
                                    className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded text-xs font-medium transition-colors"
                                  >
                                    7d Trial
                                  </button>
                                  
                                  <button
                                    onClick={() => performUserAction('TRIAL_30', user.discord_id, user.username || 'Unknown')}
                                    disabled={loadingState.action}
                                    className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 rounded text-xs font-medium transition-colors"
                                  >
                                    30d Trial
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-white/60">
                  Showing {userPage * userLimit + 1}-{Math.min((userPage + 1) * userLimit, userCount)} of {userCount} users
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const newPage = Math.max(0, userPage - 1)
                      setUserPage(newPage)
                      loadUsers(newPage, userLimit, userSearch, userStatusFilter)
                    }}
                    disabled={userPage === 0}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={() => {
                      const newPage = userPage + 1
                      setUserPage(newPage)
                      loadUsers(newPage, userLimit, userSearch, userStatusFilter)
                    }}
                    disabled={(userPage + 1) * userLimit >= userCount}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-xl p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-xl font-semibold text-primary-500">Admin Audit Logs</h2>
                
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <div className="relative flex-grow md:flex-grow-0 md:w-48">
                    <input
                      type="text"
                      placeholder="Filter by admin..."
                      value={logFilters.admin}
                      onChange={(e) => handleLogFilterChange('admin', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                  
                  <div className="relative flex-grow md:flex-grow-0 md:w-48">
                    <input
                      type="text"
                      placeholder="Filter by action..."
                      value={logFilters.action}
                      onChange={(e) => handleLogFilterChange('action', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                  
                  <div className="relative flex-grow md:flex-grow-0 md:w-48">
                    <input
                      type="text"
                      placeholder="Filter by target..."
                      value={logFilters.target}
                      onChange={(e) => handleLogFilterChange('target', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30"
                    />
                  </div>
                  
                  <select
                    value={logLimit}
                    onChange={(e) => {
                      const newLimit = parseInt(e.target.value)
                      setLogLimit(newLimit)
                      setLogPage(0)
                      loadLogs(0, newLimit, logFilters)
                    }}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30"
                  >
                    <option value="15">15 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                  </select>
                </div>
              </div>
              
              {/* Logs Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Admin</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Target</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loadingState.logs ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center">
                          <div className="flex justify-center items-center">
                            <LoadingSpinner />
                            <span className="ml-3 text-white/70">Loading logs...</span>
                          </div>
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                          No logs found matching your criteria
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-medium">{log.admin_name || 'Unknown'}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              log.action === 'WHITELIST' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              log.action === 'REVOKE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              log.action?.includes('TRIAL') ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-white/70">
                            {log.description}
                          </td>
                          <td className="px-4 py-4 font-mono text-xs text-white/70">
                            {log.target_discord_id}
                          </td>
                          <td className="px-4 py-4 text-sm text-white/70">
                            {formatDate(log.created_at)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-white/60">
                  Showing {logPage * logLimit + 1}-{Math.min((logPage + 1) * logLimit, logCount)} of {logCount} logs
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const newPage = Math.max(0, logPage - 1)
                      setLogPage(newPage)
                      loadLogs(newPage, logLimit, logFilters)
                    }}
                    disabled={logPage === 0}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={() => {
                      const newPage = logPage + 1
                      setLogPage(newPage)
                      loadLogs(newPage, logLimit, logFilters)
                    }}
                    disabled={(logPage + 1) * logLimit >= logCount}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <div className="text-2xl font-bold text-primary-500 mb-1">
                  {loadingState.analytics ? (
                    <div className="w-16 h-8 bg-white/10 animate-pulse rounded"></div>
                  ) : (
                    users.filter(u => u.revoked === false).length
                  )}
                </div>
                <div className="text-sm text-white/60">Active Users</div>
              </div>
              
              <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <div className="text-2xl font-bold text-primary-500 mb-1">
                  {loadingState.analytics ? (
                    <div className="w-16 h-8 bg-white/10 animate-pulse rounded"></div>
                  ) : (
                    users.filter(u => u.hub_trial && u.trial_expiration && new Date(u.trial_expiration) > new Date()).length
                  )}
                </div>
                <div className="text-sm text-white/60">Active Trials</div>
              </div>
              
              <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <div className="text-2xl font-bold text-primary-500 mb-1">
                  {loadingState.analytics ? (
                    <div className="w-16 h-8 bg-white/10 animate-pulse rounded"></div>
                  ) : (
                    pageAnalytics.reduce((sum, page) => sum + page.sessions, 0)
                  )}
                </div>
                <div className="text-sm text-white/60">Total Sessions</div>
              </div>
              
              <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <div className="text-2xl font-bold text-primary-500 mb-1">
                  {loadingState.analytics ? (
                    <div className="w-16 h-8 bg-white/10 animate-pulse rounded"></div>
                  ) : (
                    pageAnalytics.length
                  )}
                </div>
                <div className="text-sm text-white/60">Unique Pages</div>
              </div>
            </div>
            
            {/* Page Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Pages */}
              <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-xl p-6 overflow-hidden">
                <h2 className="text-xl font-semibold text-primary-500 mb-4">Top Pages by Usage</h2>
                
                {loadingState.analytics ? (
                  <div className="flex justify-center items-center py-8">
                    <LoadingSpinner />
                    <span className="ml-3 text-white/70">Loading analytics...</span>
                  </div>
                ) : pageAnalytics.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    No page analytics data available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Page</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Sessions</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Total Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {pageAnalytics.slice(0, 10).map((page, index) => (
                          <tr key={index} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-medium">
                              {page.page_path || '/'}
                            </td>
                            <td className="px-4 py-3 text-white/70">
                              {page.sessions}
                            </td>
                            <td className="px-4 py-3 text-white/70">
                              {formatTime(page.time_spent_seconds)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* Top Users */}
              <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-xl p-6 overflow-hidden">
                <h2 className="text-xl font-semibold text-primary-500 mb-4">Top Users by Engagement</h2>
                
                {loadingState.analytics ? (
                  <div className="flex justify-center items-center py-8">
                    <LoadingSpinner />
                    <span className="ml-3 text-white/70">Loading analytics...</span>
                  </div>
                ) : topUsers.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    No user analytics data available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">User</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Sessions</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Total Time</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {topUsers.map((user, index) => (
                          <tr key={index} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-medium">
                              {user.username || 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-white/70">
                              {user.sessions}
                            </td>
                            <td className="px-4 py-3 text-white/70">
                              {formatTime(user.time_spent)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setSelectedUser(user.username)}
                                className="px-2 py-1 bg-primary-500/20 hover:bg-primary-500/30 text-primary-500 rounded text-xs font-medium transition-colors"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
            {/* User Page Analytics (conditional) */}
            {selectedUser && (
              <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-xl p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-primary-500">
                    Page Analytics for {selectedUser}
                  </h2>
                  
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-white/70 transition-colors"
                  >
                    Close
                  </button>
                </div>
                
                {userPageAnalytics.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    No page analytics data available for this user
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Page</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Sessions</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Total Time</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Avg Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {userPageAnalytics.map((page, index) => (
                          <tr key={index} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-medium">
                              {page.page_path || '/'}
                            </td>
                            <td className="px-4 py-3 text-white/70">
                              {page.sessions}
                            </td>
                            <td className="px-4 py-3 text-white/70">
                              {formatTime(page.time_spent_seconds)}
                            </td>
                            <td className="px-4 py-3 text-white/70">
                              {formatTime(Math.round(page.time_spent_seconds / page.sessions))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}