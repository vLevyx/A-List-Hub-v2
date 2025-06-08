// auth.js

// Configuration - move these to environment variables in production
const SUPABASE_CONFIG = {
  url: 'https://dsexkdjxmhgqahrlkvax.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzZXhrZGp4bWhncWFocmxrdmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODAxNTAsImV4cCI6MjA2NDA1NjE1MH0.RW_ROpcNUNZaK9xGH2OFwHBSmFsGrLj-yi3LWCPBCvA'
};

const client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Cache for auth results to prevent excessive API calls
let authCache = {
  result: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
};



// Redirect with optional message
function redirectToHome(reason = '') {
  // Store reason in session storage for potential display on home page
  if (reason) {
    sessionStorage.setItem('auth_redirect_reason', reason);
  }
  
  // Prevent back button from returning to protected page
  window.location.replace('/');
}

// Get Discord ID from user metadata
function getDiscordId(user) {
  return user.user_metadata?.provider_id || 
         user.user_metadata?.sub || 
         user.identities?.[0]?.id;
}

// Check if user has valid trial
function hasValidTrial(userData) {
  if (!userData.hub_trial) return false;
  
  if (!userData.trial_expiration) return false;
  
  const now = new Date();
  const expirationDate = new Date(userData.trial_expiration);
  
  return expirationDate > now;
}

// Check if user is whitelisted
function isUserWhitelisted(userData) {
  if (!userData) return false;
  
  // User is whitelisted if not revoked OR has valid trial
  return userData.revoked === false || hasValidTrial(userData);
}

// Main authentication check
async function checkWhitelistAccess() {
  // Check cache first
  const now = Date.now();
  if (authCache.result && (now - authCache.timestamp) < authCache.ttl) {
    if (!authCache.result.success) {
      redirectToHome(authCache.result.reason);
    }
    return;
  }

  try {
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();

    if (userError) {
      console.error('Auth error:', userError);
      authCache = { result: { success: false, reason: 'Authentication error' }, timestamp: now, ttl: authCache.ttl };
      redirectToHome('Authentication error occurred');
      return;
    }

    if (!user) {
      authCache = { result: { success: false, reason: 'Not logged in' }, timestamp: now, ttl: authCache.ttl };
      redirectToHome('Please log in to access this page');
      return;
    }

    // Get Discord ID
    const discordId = getDiscordId(user);
    
    if (!discordId) {
      console.error('No Discord ID found for user');
      authCache = { result: { success: false, reason: 'Invalid user data' }, timestamp: now, ttl: authCache.ttl };
      redirectToHome('Invalid user account');
      return;
    }

    // Query user data from database
    const { data: userData, error: dbError } = await client
      .from('users')
      .select('revoked, hub_trial, trial_expiration')
      .eq('discord_id', discordId)
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      
      // If user not found, they might not be in the system yet
      if (dbError.code === 'PGRST116') {
        authCache = { result: { success: false, reason: 'User not found' }, timestamp: now, ttl: authCache.ttl };
        redirectToHome('Account not found in system');
      } else {
        authCache = { result: { success: false, reason: 'Database error' }, timestamp: now, ttl: authCache.ttl };
        redirectToHome('System error occurred');
      }
      return;
    }

    // Check if user is whitelisted
    if (!isUserWhitelisted(userData)) {
      let reason = 'Access denied';
      
      if (userData.revoked === true) {
        reason = 'Account access has been revoked';
      } else if (userData.hub_trial === true && userData.trial_expiration) {
        const expDate = new Date(userData.trial_expiration);
        if (expDate <= new Date()) {
          reason = 'Trial period has expired';
        }
      }
      
      authCache = { result: { success: false, reason }, timestamp: now, ttl: authCache.ttl };
      redirectToHome(reason);
      return;
    }

    // Success - cache the result
    authCache = { result: { success: true }, timestamp: now, ttl: authCache.ttl };

  } catch (error) {
    console.error('Unexpected error during auth check:', error);
    authCache = { result: { success: false, reason: 'Unexpected error' }, timestamp: now, ttl: authCache.ttl };
    redirectToHome('An unexpected error occurred');
  }
}

// Handle page visibility changes to re-check auth when user returns
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Clear cache when page becomes visible again
    authCache.result = null;
    checkWhitelistAccess();
  }
});

// Initialize auth check
checkWhitelistAccess();