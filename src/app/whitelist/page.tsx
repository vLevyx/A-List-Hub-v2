'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePageTracking } from '@/hooks/usePageTracking'
import { createClient } from '@/lib/supabase/client'
import { getDiscordId } from '@/lib/utils'

// Configuration
const DISCOUNT_ENABLED = true
const ORIGINAL_PRICE = 3000000
const DISCOUNT_RATE = 0.15
const DISCOUNTED_PRICE = ORIGINAL_PRICE * (1 - DISCOUNT_RATE)
const TRIAL_DAYS = 3

interface UserStatus {
  type: 'whitelisted_trial' | 'whitelisted' | 'active_trial' | 'expired_trial' | 'eligible'
  showForm: boolean
  showCountdown: boolean
}

export default function WhitelistPage() {
  usePageTracking()
  const router = useRouter()
  const { user, loading } = useAuth()
  const supabase = createClient()

  // Form state
  const [ign, setIgn] = useState('')
  const [referral, setReferral] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning' | null, message: string }>({ type: null, message: '' })
  
  // User status state
  const [userData, setUserData] = useState<any>(null)
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        const discordId = getDiscordId(user)
        if (!discordId) return

        const { data, error } = await supabase
          .from('users')
          .select('hub_trial, revoked, trial_expiration')
          .eq('discord_id', discordId)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user data:', error)
          return
        }

        setUserData(data || { hub_trial: false, revoked: true, trial_expiration: null })
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch user data:', error)
        setIsLoading(false)
      }
    }

    if (!loading) {
      if (user) {
        fetchUserData()
      } else {
        router.push('/')
      }
    }
  }, [user, loading, supabase, router])

  // Determine user status
  useEffect(() => {
    if (userData) {
      const now = new Date()
      const isTrialActive = userData.trial_expiration && new Date(userData.trial_expiration) > now

      if (userData.revoked === false && isTrialActive) {
        setUserStatus({ type: 'whitelisted_trial', showForm: false, showCountdown: true })
      } else if (userData.revoked === false) {
        setUserStatus({ type: 'whitelisted', showForm: false, showCountdown: false })
      } else if (userData.hub_trial && isTrialActive) {
        setUserStatus({ type: 'active_trial', showForm: false, showCountdown: true })
      } else if (userData.hub_trial) {
        setUserStatus({ type: 'expired_trial', showForm: false, showCountdown: false })
      } else {
        setUserStatus({ type: 'eligible', showForm: true, showCountdown: false })
      }
    }
  }, [userData])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ign.trim()) {
      setStatusMessage({ type: 'error', message: '❌ Please enter your in-game name.' })
      return
    }

    if (!user) {
      setStatusMessage({ type: 'error', message: '❌ You must be logged in to request a trial.' })
      return
    }

    setIsSubmitting(true)
    setStatusMessage({ type: 'info', message: 'Submitting your request...' })

    try {
      const discordId = getDiscordId(user)
      const discordUsername = user.user_metadata?.full_name || user.user_metadata?.name || 'Discord User'
      
      if (!discordId) {
        throw new Error('Could not determine Discord ID')
      }

      // Calculate trial end time (3 days from now in Unix timestamp)
      const trialEnds = Math.floor(Date.now() / 1000) + (TRIAL_DAYS * 24 * 60 * 60)

      const response = await fetch('https://dsexkdjxmhgqahrlkvax.functions.supabase.co/sendDiscordWebhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          ign,
          discordId,
          discordUsername,
          trialEnds,
          referral: referral.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to activate trial')
      }

      setStatusMessage({ type: 'success', message: '✅ Trial activated! You now have 72 hours of premium access.' })
      setIgn('')
      setReferral('')
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Error submitting whitelist request:', error)
      setStatusMessage({ 
        type: 'error', 
        message: error instanceof Error 
          ? `❌ ${error.message}` 
          : '❌ An unexpected error occurred. Please try again later.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Countdown timer component
  const CountdownTimer = ({ expirationTime }: { expirationTime: string }) => {
    const [timeLeft, setTimeLeft] = useState<string>('')

    useEffect(() => {
      const expiration = new Date(expirationTime)
      
      const updateCountdown = () => {
        const now = new Date()
        const diff = expiration.getTime() - now.getTime()

        if (diff <= 0) {
          setTimeLeft('⏰ Your trial has expired.')
          return
        }

        const totalSeconds = Math.floor(diff / 1000)
        const days = Math.floor(totalSeconds / 86400)
        const hours = Math.floor((totalSeconds % 86400) / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        let display = '⏳ Trial ends in: '
        if (days > 0) display += `${days}d `
        if (hours > 0 || days > 0) display += `${hours}h `
        display += `${minutes}m ${seconds}s`

        setTimeLeft(display)
      }

      updateCountdown()
      const timer = setInterval(updateCountdown, 1000)

      return () => clearInterval(timer)
    }, [expirationTime])

    return (
      <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 p-4 rounded-lg text-center my-4">
        {timeLeft}
      </div>
    )
  }

  // Status message based on user status
  const StatusMessage = ({ status }: { status: UserStatus }) => {
    const messages = {
      whitelisted_trial: { message: '✅ You are currently whitelisted (active trial).', type: 'success' as const },
      whitelisted: { message: '✅ You are currently whitelisted.', type: 'success' as const },
      active_trial: { message: '⏳ You have an active trial running.', type: 'warning' as const },
      expired_trial: { message: '❌ Your trial has expired. You have already used your one-time trial.', type: 'error' as const },
      eligible: { message: '', type: null as const }
    }

    const { message, type } = messages[status.type]
    
    if (!message) return null

    return (
      <div className={`p-4 rounded-lg text-center ${
        type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
        type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' :
        'bg-red-500/10 border border-red-500/30 text-red-400'
      }`}>
        {message}
      </div>
    )
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c0c0c] to-[#1a1a2e]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd700]"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0c0c] via-[#1a1a2e] to-[#16213e] bg-fixed">
      <div className="container max-w-4xl mx-auto px-4 py-8 min-h-screen flex flex-col justify-center items-center">
        <div className="w-full max-w-2xl bg-[rgba(18,18,18,0.95)] bg-gradient-to-b from-[rgba(255,255,255,0.08)] to-[rgba(255,255,255,0.04)] backdrop-blur-xl border border-white/15 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden animate-fadeIn">
          {/* Top border gradient */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ffd700]/50 to-transparent"></div>
          
          <div className="text-center mb-10">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute top-1/2 left-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffd700]/40 blur-xl animate-pulse"></div>
              <Image 
                src="https://icons.iconarchive.com/icons/microsoft/fluentui-emoji-3d/512/Crown-3d-icon.png"
                alt="Crown Icon"
                width={64}
                height={64}
                className="relative z-10"
              />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-[#ffd700] to-[#ffed4e] inline-block text-transparent bg-clip-text">
              Request A-List Plus Whitelist
            </h1>
            <p className="text-white/80 text-lg">Exclusive Premium Access</p>
          </div>

          <div className="mb-10">
            <ul className="space-y-4 mb-8">
              <li className="pl-8 relative text-white/90 text-lg">
                <span className="absolute left-0 text-[#ffd700] font-bold">✦</span>
                Complete the form below to start your premium trial experience
              </li>
              <li className="pl-8 relative text-white/90 text-lg">
                <span className="absolute left-0 text-[#ffd700] font-bold">✦</span>
                Purchase price is 
                <span className={`text-[#ffd700] font-semibold text-xl ${DISCOUNT_ENABLED ? 'line-through opacity-60' : ''}`}>
                  {' '}e${ORIGINAL_PRICE.toLocaleString()}
                </span>
                {DISCOUNT_ENABLED && (
                  <>
                    <span className="text-[#ffd700] font-semibold text-xl ml-2">
                      → e${DISCOUNTED_PRICE.toLocaleString()}
                    </span>
                    <span className="inline-block bg-gradient-to-r from-[#ffd900]/30 to-[#ffc400]/50 text-white text-xs font-semibold px-2 py-1 rounded-lg border-1.5 border-[#ffd900]/50 ml-2 align-middle">
                      15% OFF
                    </span>
                  </>
                )}
              </li>
              <li className="pl-8 relative text-white/90 text-lg">
                <span className="absolute left-0 text-[#ffd700] font-bold">✦</span>
                Once form is submitted, one of the A-List Hub staff members will be in touch with you via Discord DMs to receive payment and complete your whitelist request
              </li>
              <li className="pl-8 relative text-white/90 text-lg">
                <span className="absolute left-0 text-[#ffd700] font-bold">✦</span>
                This is a one-time purchase that unlocks all features and allows access to all future updates
              </li>
            </ul>

            <div className="bg-[#ffd700]/10 border border-[#ffd700]/30 rounded-xl p-6 text-center">
              <h3 className="text-[#ffd700] text-xl font-semibold mb-2">🎁 Complimentary Trial Access</h3>
              <p className="text-white/90">
                Upon form submission, you will be granted a <strong>3-day trial</strong> to enjoy the features and explore on your own while we process your request.
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-[#ffd700]/30 to-transparent my-8"></div>

            <div className="bg-white/5 border border-[#ffd700]/20 rounded-xl p-6 md:p-8">
              <h2 className="text-xl font-semibold text-[#ffd700] text-center flex items-center justify-center gap-2 mb-6">
                <span>⚡</span>
                <span>Start Your Premium Trial</span>
              </h2>

              {userStatus && (
                <div className="mb-6">
                  <StatusMessage status={userStatus} />
                  
                  {userStatus.showCountdown && userData.trial_expiration && (
                    <CountdownTimer expirationTime={userData.trial_expiration} />
                  )}
                </div>
              )}

              {userStatus?.showForm ? (
                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <label htmlFor="ign" className="block text-white/90 font-medium mb-2">
                      In-Game Name
                    </label>
                    <input
                      type="text"
                      id="ign"
                      value={ign}
                      onChange={(e) => setIgn(e.target.value)}
                      placeholder="Enter your IGN"
                      required
                      className="w-full p-3.5 rounded-xl border border-white/20 bg-white/8 text-white backdrop-blur-xl focus:outline-none focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/10 transition-all"
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="referral" className="block text-white/90 font-medium mb-2">
                      Referred By
                    </label>
                    <input
                      type="text"
                      id="referral"
                      value={referral}
                      onChange={(e) => setReferral(e.target.value)}
                      placeholder="IGN of who referred you? (Optional)"
                      className="w-full p-3.5 rounded-xl border border-white/20 bg-white/8 text-white backdrop-blur-xl focus:outline-none focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/10 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ffd700] text-black font-bold text-lg uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    <span className="relative z-10">
                      {isSubmitting ? 'Processing...' : 'Activate Premium Trial'}
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full hover:animate-shimmer"></span>
                  </button>

                  {statusMessage.type && (
                    <div className={`mt-6 p-4 rounded-lg text-center ${
                      statusMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
                      statusMessage.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
                      statusMessage.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' :
                      'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                    }`}>
                      {statusMessage.message}
                    </div>
                  )}
                </form>
              ) : (
                <div className="text-center">
                  {userStatus?.type === 'whitelisted' && (
                    <p className="text-white/90 text-lg">
                      You already have full access to all premium features. Enjoy!
                    </p>
                  )}
                  
                  {userStatus?.type === 'whitelisted_trial' && (
                    <p className="text-white/90 text-lg">
                      You have full access during your trial period. A staff member will contact you soon to complete your purchase.
                    </p>
                  )}
                  
                  {userStatus?.type === 'active_trial' && (
                    <p className="text-white/90 text-lg">
                      Your trial is currently active. A staff member will contact you soon to complete your purchase.
                    </p>
                  )}
                  
                  {userStatus?.type === 'expired_trial' && (
                    <p className="text-white/90 text-lg">
                      Your trial has expired. Please contact a staff member to complete your purchase.
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="text-center text-[#ffd700] font-medium text-lg mt-8">
              Enjoy your exclusive experience!
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
        
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  )
}