import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  itemName: string
  priceDetails: string
  tradeRole: 'buyer' | 'seller'
  urgency: 'asap' | 'flexible' | 'specific'
  specificTime?: string
  preferredMiddleman: string
  negotiable: boolean
  discordId: string
  username: string
  timestamp: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Verify token
    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const requestData: RequestBody = await req.json()

    // Check for rate limiting
    const { data: existingRequests, error: dbError } = await supabase
      .from('middleman_requests')
      .select('created_at')
      .eq('user_discord_id', requestData.discordId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingRequests && existingRequests.length > 0) {
      const lastRequest = new Date(existingRequests[0].created_at)
      const now = new Date()
      const diffMinutes = (now.getTime() - lastRequest.getTime()) / (1000 * 60)

      if (diffMinutes < 60) {
        return new Response(
          JSON.stringify({ error: 'Rate limited', minutesRemaining: Math.ceil(60 - diffMinutes) }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Prepare Discord webhook payload
    const webhookUrl = Deno.env.get('DISCORD_MIDDLEMAN_WEBHOOK_URL') || ''
    const roleId = '1385361927798128752' // Middleman role ID

    // Format timestamp
    const formattedTime = new Date(requestData.timestamp).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })

    // Create embed
    const embed = {
      title: `New Middleman Request: ${requestData.itemName}`,
      color: 0x00c6ff, // Light blue
      fields: [
        {
          name: 'Item',
          value: requestData.itemName,
          inline: true
        },
        {
          name: 'Price/Trade Details',
          value: requestData.priceDetails,
          inline: true
        },
        {
          name: 'Role',
          value: requestData.tradeRole === 'buyer' ? '🛒 Buyer' : '💰 Seller',
          inline: true
        },
        {
          name: 'Urgency',
          value: requestData.urgency === 'asap' 
            ? '🔥 ASAP' 
            : requestData.urgency === 'flexible' 
              ? '⏱️ Flexible' 
              : `📅 Specific: ${requestData.specificTime}`,
          inline: true
        },
        {
          name: 'Preferred Middleman',
          value: requestData.preferredMiddleman,
          inline: true
        },
        {
          name: 'Price Negotiable',
          value: requestData.negotiable ? '✅ Yes' : '❌ No',
          inline: true
        },
        {
          name: 'Requester',
          value: `<@${requestData.discordId}> (${requestData.username})`,
          inline: false
        }
      ],
      footer: {
        text: `Request ID: ${crypto.randomUUID().slice(0, 8)} • ${formattedTime}`
      }
    }

    // Send webhook
    const webhookPayload = {
      content: `<@&${roleId}> New middleman request!`,
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3, // Green
              label: "📩 Claim Request",
              custom_id: `claim_${requestData.discordId}_${Date.now()}`
            }
          ]
        }
      ]
    }

    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    })

    if (!discordResponse.ok) {
      const discordError = await discordResponse.text()
      console.error('Discord webhook error:', discordError)
      
      return new Response(
        JSON.stringify({ error: 'Failed to send Discord webhook' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})