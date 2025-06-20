'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePageTracking } from '@/hooks/usePageTracking'
import { createClient } from '@/lib/supabase/client'
import { getDiscordId, getUsername } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

// Constants
const WEBHOOK_URL = 'https://dsexkdjxmhgqahrlkvax.functions.supabase.co/sendMiddlemanRequest'
const RATE_LIMIT_MINUTES = 60
const RATE_LIMIT_KEY = 'middleman_last_request'
const MIDDLEMEN = [
  'First Available',
  'Levy Lowry',
  'Alexa Knox',
  'Chee Masters',
  'Hamish Macbeth'
]

// Types
type UrgencyLevel = 'asap' | 'flexible' | 'specific'
type TradeRole = 'buyer' | 'seller'

interface FormData {
  itemName: string
  priceDetails: string
  tradeRole: TradeRole
  urgency: UrgencyLevel
  specificTime?: string
  preferredMiddleman: string
  negotiable: boolean
}

interface RequestHistory {
  id: string
  user_discord_id: string
  item_name: string
  price_details: string
  trade_role: string
  urgency: string
  specific_time: string | null
  preferred_middleman: string
  negotiable: boolean
  status: 'pending' | 'claimed' | 'completed' | 'cancelled'
  claimed_by?: string | null
  created_at: string
  updated_at: string | null
}

export default function MiddlemanMarketPage() {
  usePageTracking()
  const router = useRouter()
  const { user, loading, hasAccess } = useAuth()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState<FormData>({
    itemName: '',
    priceDetails: '',
    tradeRole: 'seller',
    urgency: 'asap',
    specificTime: '',
    preferredMiddleman: 'First Available',
    negotiable: false
  })

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning' | null, message: string }>({ type: null, message: '' })
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [requestHistory, setRequestHistory] = useState<RequestHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [showScamList, setShowScamList] = useState(false)
  const [scamList, setScamList] = useState<any[]>([])
  const [isLoadingScamList, setIsLoadingScamList] = useState(true)

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Redirect if not logged in or no access
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  // Check rate limit on load
  useEffect(() => {
    if (!user) return

    const lastRequest = localStorage.getItem(RATE_LIMIT_KEY)
    if (lastRequest) {
      const lastRequestTime = parseInt(lastRequest, 10)
      const currentTime = Date.now()
      const elapsedMinutes = (currentTime - lastRequestTime) / (1000 * 60)
      
      if (elapsedMinutes < RATE_LIMIT_MINUTES) {
        const remainingMinutes = Math.ceil(RATE_LIMIT_MINUTES - elapsedMinutes)
        setTimeRemaining(remainingMinutes)
        startRateLimitTimer(remainingMinutes)
      }
    }

    // Load request history
    loadRequestHistory()
    
    // Load scam list
    loadScamList()

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [user])

  // Load user's request history
  const loadRequestHistory = async () => {
    if (!user) return
    
    setIsLoadingHistory(true)
    
    try {
      const discordId = getDiscordId(user)
      
      const { data, error } = await supabase
        .from('middleman_requests')
        .select('*')
        .eq('user_discord_id', discordId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      
      setRequestHistory(data || [])
    } catch (error) {
      console.error('Error loading request history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Load scam list
  const loadScamList = async () => {
    setIsLoadingScamList(true)
    
    try {
      const { data, error } = await supabase
        .from('scam_list')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setScamList(data || [])
    } catch (error) {
      console.error('Error loading scam list:', error)
    } finally {
      setIsLoadingScamList(false)
    }
  }

  // Start rate limit timer
  const startRateLimitTimer = (minutes: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    let remainingSeconds = minutes * 60
    
    timerRef.current = setInterval(() => {
      remainingSeconds -= 1
      
      if (remainingSeconds <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        setTimeRemaining(null)
      } else {
        const remainingMinutes = Math.ceil(remainingSeconds / 60)
        setTimeRemaining(remainingMinutes)
      }
    }, 1000)
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setStatusMessage({ type: 'error', message: 'You must be logged in to request a middleman.' })
      return
    }
    
    // Check rate limit
    const lastRequest = localStorage.getItem(RATE_LIMIT_KEY)
    if (lastRequest) {
      const lastRequestTime = parseInt(lastRequest, 10)
      const currentTime = Date.now()
      const elapsedMinutes = (currentTime - lastRequestTime) / (1000 * 60)
      
      if (elapsedMinutes < RATE_LIMIT_MINUTES) {
        const remainingMinutes = Math.ceil(RATE_LIMIT_MINUTES - elapsedMinutes)
        setStatusMessage({ 
          type: 'warning', 
          message: `Please wait ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} before making another request.` 
        })
        return
      }
    }
    
    // Validate form
    if (!formData.itemName.trim()) {
      setStatusMessage({ type: 'error', message: 'Please enter an item name.' })
      return
    }
    
    if (!formData.priceDetails.trim()) {
      setStatusMessage({ type: 'error', message: 'Please enter price or trade details.' })
      return
    }
    
    if (formData.urgency === 'specific' && !formData.specificTime?.trim()) {
      setStatusMessage({ type: 'error', message: 'Please specify a time for your trade.' })
      return
    }
    
    setIsSubmitting(true)
    setStatusMessage({ type: null, message: '' })
    
    try {
      const discordId = getDiscordId(user)
      const username = getUsername(user)
      
      // Prepare request data
      const requestData = {
        ...formData,
        discordId,
        username,
        timestamp: new Date().toISOString()
      }
      
      // Send webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(requestData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send request')
      }
      
      // Save request to database
      const { error: dbError } = await supabase
        .from('middleman_requests')
        .insert([{
          user_discord_id: discordId,
          item_name: formData.itemName,
          price_details: formData.priceDetails,
          trade_role: formData.tradeRole,
          urgency: formData.urgency,
          specific_time: formData.urgency === 'specific' ? formData.specificTime : null,
          preferred_middleman: formData.preferredMiddleman,
          negotiable: formData.negotiable,
          status: 'pending'
        }])
      
      if (dbError) throw dbError
      
      // Set rate limit
      localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString())
      
      // Show success message
      setStatusMessage({ 
        type: 'success', 
        message: 'Your middleman request has been sent successfully! A middleman will contact you soon.' 
      })
      
      // Reset form
      if (formRef.current) {
        formRef.current.reset()
      }
      
      setFormData({
        itemName: '',
        priceDetails: '',
        tradeRole: 'seller',
        urgency: 'asap',
        specificTime: '',
        preferredMiddleman: 'First Available',
        negotiable: false
      })
      
      // Set rate limit timer
      setTimeRemaining(RATE_LIMIT_MINUTES)
      startRateLimitTimer(RATE_LIMIT_MINUTES)
      
      // Refresh request history
      loadRequestHistory()
      
    } catch (error) {
      console.error('Error submitting middleman request:', error)
      setStatusMessage({ 
        type: 'error', 
        message: error instanceof Error 
          ? `Error: ${error.message}` 
          : 'An unexpected error occurred. Please try again later.' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#121212] to-[#1a1a1a]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Access check
  if (!hasAccess && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#121212] to-[#1a1a1a] p-4">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Premium Feature</h2>
          <p className="text-white/80 mb-6">
            The Middleman Market is a premium feature. Please upgrade to access this service.
          </p>
          <Link href="/whitelist">
            <Button variant="premium" size="lg">
              Upgrade Now
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#121212] to-[#1a1a1a] p-4">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Login Required</h2>
          <p className="text-white/80 mb-6">
            Please log in with Discord to access the Middleman Market.
          </p>
          <Button onClick={() => router.push('/')} variant="default" size="lg">
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] to-[#1a1a1a] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text mb-2">
            Middleman Market
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto">
            Request a trusted middleman to facilitate secure trades in ELAN Life. Our middlemen ensure both parties receive what was agreed upon.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Request Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="bg-primary-500 text-black w-6 h-6 rounded-full flex items-center justify-center mr-2 text-sm">1</span>
                Request a Middleman
              </h2>

              {timeRemaining ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-lg mb-4">
                  <p className="flex items-center">
                    <span className="mr-2">⏳</span>
                    Please wait {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''} before making another request.
                  </p>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="itemName" className="block text-white/90 font-medium mb-1">
                      Item Name*
                    </label>
                    <input
                      type="text"
                      id="itemName"
                      name="itemName"
                      value={formData.itemName}
                      onChange={handleInputChange}
                      placeholder="What are you trading?"
                      className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="priceDetails" className="block text-white/90 font-medium mb-1">
                      Price/Trade Details*
                    </label>
                    <textarea
                      id="priceDetails"
                      name="priceDetails"
                      value={formData.priceDetails}
                      onChange={handleInputChange}
                      placeholder="e.g., 5,000,000 E$ or trading for M416 + 3 magazines"
                      className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 min-h-[80px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 font-medium mb-1">
                      Your Role*
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="tradeRole"
                          value="buyer"
                          checked={formData.tradeRole === 'buyer'}
                          onChange={handleInputChange}
                          className="mr-2 accent-primary-500"
                        />
                        Buyer
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="tradeRole"
                          value="seller"
                          checked={formData.tradeRole === 'seller'}
                          onChange={handleInputChange}
                          className="mr-2 accent-primary-500"
                        />
                        Seller
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/90 font-medium mb-1">
                      Urgency*
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="urgency"
                          value="asap"
                          checked={formData.urgency === 'asap'}
                          onChange={handleInputChange}
                          className="mr-2 accent-primary-500"
                        />
                        ASAP
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="urgency"
                          value="flexible"
                          checked={formData.urgency === 'flexible'}
                          onChange={handleInputChange}
                          className="mr-2 accent-primary-500"
                        />
                        Flexible
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="urgency"
                          value="specific"
                          checked={formData.urgency === 'specific'}
                          onChange={handleInputChange}
                          className="mr-2 accent-primary-500"
                        />
                        Specific Time
                      </label>
                    </div>
                  </div>

                  {formData.urgency === 'specific' && (
                    <div>
                      <label htmlFor="specificTime" className="block text-white/90 font-medium mb-1">
                        Specify Time*
                      </label>
                      <input
                        type="text"
                        id="specificTime"
                        name="specificTime"
                        value={formData.specificTime}
                        onChange={handleInputChange}
                        placeholder="e.g., Today at 8PM EST"
                        className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="preferredMiddleman" className="block text-white/90 font-medium mb-1">
                      Preferred Middleman
                    </label>
                    <select
                      id="preferredMiddleman"
                      name="preferredMiddleman"
                      value={formData.preferredMiddleman}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                    >
                      {MIDDLEMEN.map(middleman => (
                        <option key={middleman} value={middleman}>{middleman}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="negotiable"
                      name="negotiable"
                      checked={formData.negotiable}
                      onChange={handleCheckboxChange}
                      className="w-4 h-4 accent-primary-500 mr-2"
                    />
                    <label htmlFor="negotiable" className="text-white/90">
                      Price is negotiable
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || timeRemaining !== null}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <LoadingSpinner size="sm" className="mr-2" />
                        Submitting...
                      </span>
                    ) : (
                      'Request Middleman'
                    )}
                  </Button>

                  {statusMessage.type && (
                    <div className={`p-4 rounded-lg ${
                      statusMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
                      statusMessage.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
                      'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                    }`}>
                      {statusMessage.message}
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Request History */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <span className="bg-primary-500 text-black w-6 h-6 rounded-full flex items-center justify-center mr-2 text-sm">2</span>
                Your Recent Requests
              </h2>

              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : requestHistory.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  <p>You haven't made any middleman requests yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requestHistory.map(request => (
                    <div 
                      key={request.id} 
                      className="bg-white/5 border border-white/10 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-white">{request.item_name}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          request.status === 'claimed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          request.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-white/80 text-sm mb-2">{request.price_details}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-white/60">
                        <span>Role: {request.trade_role.charAt(0).toUpperCase() + request.trade_role.slice(1)}</span>
                        <span>•</span>
                        <span>Urgency: {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}</span>
                        <span>•</span>
                        <span>Requested: {new Date(request.created_at).toLocaleString()}</span>
                      </div>
                      {request.claimed_by && (
                        <div className="mt-2 text-sm text-primary-400">
                          Claimed by: {request.claimed_by}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Info & Scam List */}
          <div className="space-y-6">
            {/* How It Works */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
              <ol className="space-y-4 text-white/80">
                <li className="flex gap-3">
                  <span className="bg-primary-500 text-black w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-semibold">1</span>
                  <div>
                    <p>Fill out the request form with details about your trade.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary-500 text-black w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-semibold">2</span>
                  <div>
                    <p>Your request is sent to our trusted middlemen via Discord.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary-500 text-black w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-semibold">3</span>
                  <div>
                    <p>A middleman will claim your request and contact you via Discord.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="bg-primary-500 text-black w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-semibold">4</span>
                  <div>
                    <p>The middleman will facilitate the trade, ensuring both parties receive what was agreed upon.</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Scam List */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Scam List</h2>
                <button 
                  onClick={() => setShowScamList(!showScamList)}
                  className="text-primary-500 hover:text-primary-400 text-sm font-medium"
                >
                  {showScamList ? 'Hide List' : 'Show List'}
                </button>
              </div>
              
              {showScamList ? (
                isLoadingScamList ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : scamList.length === 0 ? (
                  <p className="text-white/60 text-center py-4">No scammers reported yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {scamList.map((scammer) => (
                      <div 
                        key={scammer.id} 
                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                      >
                        <div className="flex justify-between">
                          <h3 className="font-semibold text-white">{scammer.in_game_name}</h3>
                          <span className="text-xs text-white/60">
                            {new Date(scammer.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {scammer.discord_name && (
                          <p className="text-sm text-white/80">Discord: {scammer.discord_name}</p>
                        )}
                        {scammer.discord_id && (
                          <p className="text-xs text-white/60">ID: {scammer.discord_id}</p>
                        )}
                        {scammer.description && (
                          <p className="text-sm text-white/80 mt-2 border-t border-white/10 pt-2">
                            {scammer.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-white/80">
                  <p>View a list of known scammers to avoid in ELAN Life. This list is maintained by A-List admins based on verified reports.</p>
                  <p className="mt-2 text-sm text-white/60">
                    To report a scammer, please provide video evidence to our Discord server.
                  </p>
                </div>
              )}
            </div>

            {/* Trusted Middlemen */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Trusted Middlemen</h2>
              <div className="space-y-3">
                {MIDDLEMEN.slice(1).map((middleman) => (
                  <div 
                    key={middleman} 
                    className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-500">
                      {middleman.split(' ').map(name => name[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-white">{middleman}</p>
                      <p className="text-xs text-white/60">Trusted Middleman</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}