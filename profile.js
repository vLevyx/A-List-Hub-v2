import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.6';

const client = createClient(
  'https://dsexkdjxmhgqahrlkvax.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzZXhrZGp4bWhncWFocmxrdmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODAxNTAsImV4cCI6MjA2NDA1NjE1MH0.RW_ROpcNUNZaK9xGH2OFwHBSmFsGrLj-yi3LWCPBCvA'
);

window.client = client;

// Enhanced mobile-specific configuration with increased timeouts
const CONFIG = {
  MAX_RETRY_ATTEMPTS: 10,          // Increased for mobile networks
  RETRY_DELAY: 1500,               // Longer base delay for mobile
  SESSION_CHECK_ATTEMPTS: 25,      // Significantly more attempts for mobile session loading
  SESSION_CHECK_DELAY: 750,        // Longer delay between checks
  MOBILE_TIMEOUT: 20000,           // 20 second timeout for mobile operations
  DEFAULT_ON_CATEGORIES: ['Components', 'HQ Components'],
  DEFAULT_AVATAR: 'https://cdn.discordapp.com/embed/avatars/0.png',
  FALLBACK_USERNAME: 'Unknown User'
};

const itemsByCategory = {
  'Weapons': ['AK-74', 'AKS-74U', 'CheyTac M200 Intervention', 'Colt 1911', 'Desert Eagle', 'M16A2', 'M16A2 - AUTO', 'M16 Carbine', 'M21 SWS', 'M249 SAW', 'M416', 'M9', 'MP 43 1C', 'MP5A2', 'MP7A2', 'PKM', 'PM', 'RPK-74',
    'Sa-58P', 'Sa-58V', 'Scar-H', 'SIG MCX', 'SIG MCX SPEAR', 'SSG10A2-Sniper', 'Steyr AUG', 'SR-25 Rifle', 'SVD'],

  'Magazines': ['30rnd 9x19 Mag', '8rnd .45 ACP', '9x18mm 8rnd PM Mag', '9x19mm 15rnd M9 Mag', '.300 Blackout Mag', '.338 5rnd FMJ', '.50 AE 7rnd Mag',
    '12/70 7mm Buckshot', '4.6x40 40rnd Mag', '5.45x39mm 30rnd AK Mag', '5.45x39mm 45rnd RPK-74 Tracer Mag', '5.56x45mm 30rnd AUG Mag',
    '5.56x45mm 30rnd STANAG Mag', '5.56x45mm 200rnd M249 Belt', '7Rnd M200 Magazine', '7.62x39mm 30rnd Sa-58 Mag', '7.62x51mm FMJ', '7.62x51mm 20rnd M14 Mag',
    '7.62x51mm 30rnd Mag', 'SR25 7.62x51mm 20rnd', '7.62x54mmR 100rnd PK Belt', '7.62x54mmR 10rnd SVD Sniper Mag', 'SPEAR 6.8x51 25rnd'],

  'Attachments': ['A2 Flash Hider', 'ART II Scope', 'Carry Handle Red-Dot-Sight', 'EOTECH XPS3', 'Elcan Specter', 'Leupold VX-6', 'PSO-1 Scope', 'Reflex Scope', '4x20 Carry Handle Scope', '4.7mm FlashHider', '6.8x51mm FlashHider', '6P26 Flash Hider',
    '6P20 Muzzle Brake', '7.62x51mm FlashHider'],

  'Vehicles': ['M1025 Light Armoured Vehicle', 'M151A2 Off-Road', 'M151A2 Off-Road Open Top', 'M923A1 Fuel Truck', 'M923A1 Transport Truck', 'M923A1 Transport Truck - Canopy',
    'M998 Light Utility Vehicle', 'M998 Light Utility Vehicle - Canopy', 'Mi-8MT Transport Helicopter', 'Pickup-Truck', 'S105 Car', 'S1203 Minibus', 'S1203 - Laboratory', 'UAZ-452 Off-road', 'UAZ-452 Off-road - Laboratory',
    'UAZ-469 Off-road', 'UAZ-469 Off-road - Open Top', 'UH-1H Transport Helicopter', 'Ural-4320 Fuel Truck', 'Ural-4320 Transport Truck', 'Ural-4320 Transport Truck - Canopy', 'Ural (Device)', 'VW Rolf'],

  'Vests': ['6B2 Vest', '6B3 Vest', 'M69 Vest', 'PASGT Vest'],

  'Helmets': ['PASGT Helmet', 'PASGT Helmet - Camouflaged', 'PASGT Helmet - Camouflaged Netting', 'SPH-4 Helmet', 'SSh-68 Helmet',
    'SSh-68 Helmet - Camouflaged', 'SSh-68 Helmet - Cover', 'SSh-68 Helmet - KZS', 'SSh-68 Helmet - Netting', 'ZSh-5 Helmet'],

  'Clothes': ['ALICE Medium Backpack', 'Bandana', 'Balaclava', 'BDU Blouse', 'BDU Blouse - Rolled-up', 'BDU Trousers', 'Beanie', 'Boonie', 'Cap - All Variants', 'Cargo Pants', 'Cargo Pants (Colored)',
    'Cardigan', 'Classic Shoe', 'CWU-27 Pilot Coveralls', 'Dress', 'Fedora', 'Fisher Hat', 'Flat Cap', 'Half Mask', 'Hunting Vest', 'IIFS Large Combat Field Pack',
    'Jacket', 'Jeans', 'Jeans (Colored)', 'KLMK Coveralls', 'Knit Cap', 'Kolobok Backpack', 'M70 Backpack', 'M70 Cap', 'M70 Parka',
    'M70 Trousers', 'M88 Field Cap', 'M88 Jacket', 'M88 Jacket - Rolled-up', 'M88 Trousers', 'Mask (Medical)', 'Mask (Latex)', 'Mask (Ski)', 'Officer\'s Cap',
    'Panamka', 'Paper Bag', 'Polo', 'Pullover', 'Robe', 'Runner Shoe', 'Sneaker', 'Soviet Combat Boots',
    'Soviet Pilot Jacket', 'Soviet Pilot Pants', 'Suit Jacket', 'Suit Pants', 'Sweater', 'Sweat Pants', 'TShirt', 'US Combat Boots',
    'Veshmeshok Backpack', 'Wool Hat'],

  'HQ Components': ['Ammo (HQ)', 'Attachment Part (HQ)', 'Component (HQ)', 'Engine Part (HQ)', 'Interior Part (HQ)',
    'Kevlar', 'Mechanical Component (HQ)', 'Rotor (HQ)', 'Stabilizer (HQ)', 'Weapon Part (HQ)', 'Special Rotor', 'Special Gun Barrel'],

  'Components': ['Cloth', 'Iron Plate', 'Component', 'Tempered Glass', 'Weapon Part', 'Stabilizer', 'Attachment Part',
    'Ammo', 'Mechanical Component', 'Engine Part', 'Interior Part', 'Rotor']
};

// Enhanced Logger with better mobile debugging
const Logger = {
  log(step, message, data = null) {
    const timestamp = new Date().toISOString();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log(`[${timestamp}] [${isMobile ? '📱' : '💻'}] [🔍 ${step}]`, message, data || '');
  },

  warn(step, message, data = null) {
    const timestamp = new Date().toISOString();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.warn(`[${timestamp}] [${isMobile ? '📱' : '💻'}] [⚠️ ${step}]`, message, data || '');
  },

  error(step, message, error = null) {
    const timestamp = new Date().toISOString();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.error(`[${timestamp}] [${isMobile ? '📱' : '💻'}] [❌ ${step}]`, message, error || '');
  }
};

// Mobile device detection and capabilities
const MobileUtils = {
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  isAndroid() {
    return /Android/.test(navigator.userAgent);
  },

  hasSlowConnection() {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      return conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.saveData;
    }
    return false;
  },

  getOptimalTimeout() {
    if (this.hasSlowConnection()) return CONFIG.MOBILE_TIMEOUT * 2;
    if (this.isMobile()) return CONFIG.MOBILE_TIMEOUT;
    return 10000;
  }
};

// Enhanced user utilities with mobile considerations and FIXED getAvatarUrl
const UserUtils = {
  getDiscordId(user) {
    if (!user) {
      Logger.warn('USER_UTILS', 'No user object provided to getDiscordId');
      return null;
    }

    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};

    // Check multiple possible locations for Discord ID
    const possibleIds = [
      metadata.provider_id,
      metadata.sub,
      appMetadata.provider_id,
      user.id,
      metadata.discord_id,
      appMetadata.discord_id
    ];

    const discordId = possibleIds.find(id => id && id.toString().length > 10);
    Logger.log('USER_UTILS', `Discord ID extracted: ${discordId}`, {
      metadata,
      appMetadata,
      userId: user.id
    });

    return discordId;
  },

  getUsername(user) {
    if (!user) return CONFIG.FALLBACK_USERNAME;

    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};

    const possibleNames = [
      metadata.preferred_username,
      metadata.full_name,
      metadata.name,
      metadata.display_name,
      metadata.username,
      appMetadata.username,
      user.email,
      'Unknown User'
    ];

    const username = possibleNames.find(name => name && name.toString().length > 0);
    Logger.log('USER_UTILS', `Username extracted: ${username}`);
    return username || CONFIG.FALLBACK_USERNAME;
  },

  // CRITICAL FIX: Added missing getAvatarUrl function
  getAvatarUrl(user) {
    if (!user) return CONFIG.DEFAULT_AVATAR;

    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};

    const possibleAvatars = [
      metadata.avatar_url,
      metadata.picture,
      metadata.avatar,
      appMetadata.avatar_url,
      appMetadata.picture,
      CONFIG.DEFAULT_AVATAR
    ];

    const avatarUrl = possibleAvatars.find(url => url && url.toString().length > 10);
    Logger.log('USER_UTILS', `Avatar URL extracted: ${avatarUrl}`);
    return avatarUrl || CONFIG.DEFAULT_AVATAR;
  }
};

// CRITICAL FIX: Enhanced retry mechanism with timeout handling for all operations
async function withRetry(operation, operationName, maxAttempts = CONFIG.MAX_RETRY_ATTEMPTS) {
  const isMobile = MobileUtils.isMobile();
  const timeoutMs = isMobile ? 15000 : 8000; // 15 seconds for mobile, 8 for desktop
  let lastError;

  // Increase attempts for mobile devices
  if (isMobile) {
    maxAttempts = Math.max(maxAttempts, CONFIG.MAX_RETRY_ATTEMPTS);
  }

  Logger.log('RETRY', `Starting ${operationName} - Mobile: ${isMobile}, Max attempts: ${maxAttempts}, Timeout: ${timeoutMs}ms`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      Logger.log('RETRY', `${operationName} - Attempt ${attempt}/${maxAttempts}`);
      
      // CRITICAL FIX: Add timeout to ALL operations, not just auth
      const result = await withTimeout(
        operation(),
        timeoutMs,
        `${operationName} attempt ${attempt}`
      );
      
      Logger.log('RETRY', `✓ ${operationName} - Success on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      
      const isTimeout = error.message.includes('timed out');
      Logger.warn('RETRY', `${operationName} - Failed attempt ${attempt}: ${error.message}`, {
        isTimeout,
        mobile: isMobile
      });

      // Special handling for database timeouts on mobile
      if (isTimeout && isMobile && operationName.includes('Profile Data Load')) {
        Logger.log('RETRY', 'Database timeout detected on mobile, using fallback data');
        
        // Return fallback data for profile queries
        if (operationName.includes('Profile Data Load')) {
          return {
            created_at: new Date().toISOString(),
            last_login: null,
            revoked: false, // Default to not revoked
            login_count: 0
          };
        }
      }

      if (isTimeout && isMobile && operationName.includes('Blueprint Data Load')) {
        Logger.log('RETRY', 'Blueprint query timeout detected on mobile, returning empty array');
        return [];
      }

      if (attempt < maxAttempts) {
        // Progressive backoff with mobile considerations
        let delay = CONFIG.RETRY_DELAY * Math.pow(1.5, attempt - 1);
        if (isMobile) delay *= 1.5; // 50% longer delays on mobile
        if (MobileUtils.hasSlowConnection()) delay *= 2; // Double delay for slow connections

        Logger.log('RETRY', `${operationName} - Waiting ${delay}ms before retry (mobile optimized)`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Final fallback for mobile timeouts
  if (lastError?.message?.includes('timed out') && isMobile) {
    Logger.warn('RETRY', `${operationName} - All attempts timed out, providing fallback data`);
    
    if (operationName.includes('Profile Data Load')) {
      return {
        created_at: new Date().toISOString(),
        last_login: null,
        revoked: false,
        login_count: 0
      };
    }
    
    if (operationName.includes('Blueprint Data Load')) {
      return [];
    }
  }

  Logger.error('RETRY', `${operationName} - All ${maxAttempts} attempts failed (Mobile: ${isMobile})`, lastError);
  throw lastError;
}

// CRITICAL FIX: Add mobile session persistence (like index.js has)
const MobileSessionManager = {
  MOBILE_SESSION_KEY: 'mobile_user_session',
  MOBILE_ACCESS_KEY: 'mobile_user_access',

  persistSessionToLocal(session, hasAccess) {
    if (!session?.user) return;

    try {
      const sessionData = {
        user: {
          id: session.user.id,
          user_metadata: session.user.user_metadata,
          app_metadata: session.user.app_metadata
        },
        timestamp: Date.now()
      };
      localStorage.setItem(this.MOBILE_SESSION_KEY, JSON.stringify(sessionData));
      localStorage.setItem(this.MOBILE_ACCESS_KEY, hasAccess.toString());
      Logger.log('MOBILE_SESSION', 'Session persisted to local storage');
    } catch (error) {
      Logger.error('MOBILE_SESSION', 'Failed to persist session', error);
    }
  },

  loadSessionFromLocal() {
    try {
      const sessionStr = localStorage.getItem(this.MOBILE_SESSION_KEY);
      const accessStr = localStorage.getItem(this.MOBILE_ACCESS_KEY);

      if (!sessionStr) return null;

      const sessionData = JSON.parse(sessionStr);
      const hasAccess = accessStr === 'true';

      // Check if session is not too old (24 hours)
      const sessionAge = Date.now() - sessionData.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (sessionAge > maxAge) {
        Logger.warn('MOBILE_SESSION', 'Local session expired, clearing');
        this.clearLocalSession();
        return null;
      }

      Logger.log('MOBILE_SESSION', 'Loading session from local storage');
      return {
        session: { user: sessionData.user },
        hasAccess: hasAccess
      };
    } catch (error) {
      Logger.error('MOBILE_SESSION', 'Failed to load session from local storage', error);
      this.clearLocalSession();
      return null;
    }
  },

  clearLocalSession() {
    try {
      localStorage.removeItem(this.MOBILE_SESSION_KEY);
      localStorage.removeItem(this.MOBILE_ACCESS_KEY);
      Logger.log('MOBILE_SESSION', 'Local session cleared');
    } catch (error) {
      Logger.error('MOBILE_SESSION', 'Failed to clear local session', error);
    }
  }
};

// Enhanced authentication with timeout handling and comprehensive mobile debugging
async function getAuthenticatedUser() {
  Logger.log('AUTH', 'Starting mobile-aware authentication check');

  return await withRetry(async () => {
    let session = null;
    const isMobile = MobileUtils.isMobile();
    const timeoutMs = isMobile ? 8000 : 5000;

    Logger.log('AUTH', 'Checking if mobile device for session recovery');

    // CRITICAL FIX: Try mobile session recovery first (like index.js does)
    if (isMobile) {
      Logger.log('AUTH', 'Mobile device detected, attempting local session recovery');
      
      try {
        const localData = MobileSessionManager.loadSessionFromLocal();
        if (localData?.session?.user) {
          Logger.log('AUTH', 'Found local session data', {
            userId: localData.session.user.id,
            hasAccess: localData.hasAccess
          });
          
          session = localData.session;
          
          // Validate the local session by checking with Supabase (with timeout)
          try {
            Logger.log('AUTH', 'Validating local session with Supabase (with timeout)');
            const sessionCheckPromise = client.auth.getSession();
            const { data: { session: currentSession }, error } = await withTimeout(
              sessionCheckPromise,
              timeoutMs,
              'Session validation'
            );
            
            if (error) {
              Logger.warn('AUTH', 'Error validating session with Supabase', error);
            }
            
            if (currentSession?.user) {
              Logger.log('AUTH', 'Local session validated with Supabase, using Supabase session');
              session = currentSession;
            } else {
              Logger.log('AUTH', 'Supabase session missing but local session exists, using local');
            }
          } catch (validationError) {
            if (validationError.message.includes('timed out')) {
              Logger.warn('AUTH', 'Session validation timed out, using local session');
            } else {
              Logger.warn('AUTH', 'Failed to validate local session with Supabase, using local anyway', validationError);
            }
          }
          
          if (session?.user) {
            Logger.log('AUTH', 'Returning user from session recovery', {
              userId: session.user.id,
              metadata: session.user.user_metadata
            });
            return session.user;
          }
        } else {
          Logger.log('AUTH', 'No local session data found');
        }
      } catch (localError) {
        Logger.error('AUTH', 'Error during local session recovery', localError);
      }

      // If no local session, try refreshing (with timeout)
      Logger.log('AUTH', 'No local session found, attempting Supabase session refresh');
      
      try {
        const refreshPromise = client.auth.refreshSession();
        const { data: { session: refreshedSession }, error: refreshError } = await withTimeout(
          refreshPromise,
          timeoutMs,
          'Session refresh'
        );

        if (refreshError) {
          Logger.warn('AUTH', 'Session refresh failed', refreshError);
        } else if (refreshedSession?.user) {
          Logger.log('AUTH', 'Session refreshed successfully on mobile', {
            userId: refreshedSession.user.id
          });
          
          // Persist the refreshed session for future use
          MobileSessionManager.persistSessionToLocal(refreshedSession, true);
          return refreshedSession.user;
        } else {
          Logger.log('AUTH', 'Session refresh returned no session');
        }
      } catch (refreshError) {
        if (refreshError.message.includes('timed out')) {
          Logger.error('AUTH', 'Session refresh timed out');
        } else {
          Logger.error('AUTH', 'Exception during session refresh', refreshError);
        }
      }
    }

    // Fallback to normal session check (with timeout)
    Logger.log('AUTH', 'Attempting normal session check with timeout');
    
    try {
      const sessionPromise = client.auth.getSession();
      const { data: { session: normalSession }, error: sessionError } = await withTimeout(
        sessionPromise,
        timeoutMs,
        'Normal session check'
      );

      if (sessionError) {
        Logger.error('AUTH', 'Normal session check error', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }

      Logger.log('AUTH', 'Normal session check result', {
        hasSession: !!normalSession,
        hasUser: !!normalSession?.user,
        userId: normalSession?.user?.id
      });

      if (!normalSession || !normalSession.user) {
        throw new Error('No valid session found');
      }

      Logger.log('AUTH', 'Valid session found via normal check', {
        userId: normalSession.user.id,
        provider: normalSession.user.app_metadata?.provider,
        metadata: normalSession.user.user_metadata
      });

      // Persist session for mobile use
      if (isMobile) {
        Logger.log('AUTH', 'Persisting session for mobile use');
        MobileSessionManager.persistSessionToLocal(normalSession, true);
      }

      return normalSession.user;
    } catch (sessionError) {
      if (sessionError.message.includes('timed out')) {
        Logger.error('AUTH', 'Normal session check timed out');
        
        // Last resort: try to use any cached data
        if (isMobile) {
          const localData = MobileSessionManager.loadSessionFromLocal();
          if (localData?.session?.user) {
            Logger.log('AUTH', 'Using cached session as last resort due to timeout');
            return localData.session.user;
          }
        }
        
        throw new Error('Session check timed out and no cached session available');
      } else {
        Logger.error('AUTH', 'Exception during normal session check', sessionError);
        throw sessionError;
      }
    }
  }, 'Mobile Authentication Check');
}

// Mobile-optimized profile loading with direct timeout on database queries
async function loadUserProfile(user) {
  Logger.log('PROFILE', 'Loading user profile (mobile optimized)');

  const discordId = UserUtils.getDiscordId(user);
  const username = UserUtils.getUsername(user);
  const avatarUrl = UserUtils.getAvatarUrl(user);

  if (!discordId) {
    Logger.error('PROFILE', 'Critical: No Discord ID found', user);
    throw new Error('Unable to extract Discord ID from user data');
  }

  // Always update UI elements first (guaranteed execution)
  updateUIElements({
    avatar: avatarUrl,
    username: username,
    discordId: discordId
  });

  // CRITICAL FIX: Apply timeout directly to database query
  const isMobile = MobileUtils.isMobile();
  const queryTimeout = isMobile ? 8000 : 5000; // 8 seconds for mobile

  try {
    Logger.log('PROFILE', `Querying users table for discord_id: ${discordId} with ${queryTimeout}ms timeout`);

    // CRITICAL FIX: Wrap the actual database query in timeout
    const profileData = await withTimeout(
      client
        .from('users')
        .select('created_at, last_login, revoked, login_count')
        .eq('discord_id', discordId)
        .maybeSingle(),
      queryTimeout,
      'Profile database query'
    );

    if (profileData.error) {
      Logger.error('PROFILE', 'Database query error', profileData.error);
      throw profileData.error;
    }

    Logger.log('PROFILE', 'Profile query result', profileData.data);

    if (profileData.data) {
      updateUserInfo(profileData.data);
      Logger.log('PROFILE', 'Profile data loaded and UI updated successfully');
    } else {
      Logger.warn('PROFILE', 'No profile data found in database, using defaults');
      updateUserInfo(getDefaultUserInfo());
    }

  } catch (error) {
    const isTimeout = error.message && error.message.includes('timed out');
    Logger.error('PROFILE', `Database query failed${isTimeout ? ' (timeout)' : ''}`, error);
    
    // Use fallback data immediately on timeout or error
    const fallbackData = {
      created_at: new Date().toISOString(),
      last_login: null,
      revoked: false, // Default to not revoked for mobile users
      login_count: 0
    };
    
    Logger.log('PROFILE', 'Using fallback profile data due to database issues', fallbackData);
    updateUserInfo(fallbackData);
  }

  return discordId;
}

// Mobile-safe UI update function with element existence checks and enhanced mobile debugging
function updateUIElements({ avatar, username, discordId }) {
  Logger.log('UI', 'Updating UI elements for mobile', { avatar, username, discordId });

  const updates = [
    { id: 'avatar', property: 'src', value: avatar, fallback: CONFIG.DEFAULT_AVATAR },
    { id: 'username', property: 'textContent', value: username, fallback: CONFIG.FALLBACK_USERNAME },
    { id: 'discordId', property: 'textContent', value: discordId, fallback: 'Loading...' }
  ];

  updates.forEach(({ id, property, value, fallback }) => {
    Logger.log('UI', `Attempting to update ${id} with value: ${value}`);
    
    try {
      const element = document.getElementById(id);
      if (element) {
        element[property] = value || fallback;
        Logger.log('UI', `✓ Updated ${id} successfully to: ${value || fallback}`);
      } else {
        Logger.warn('UI', `⚠️ Element ${id} not found in DOM - will retry`);
        
        // Multiple retry attempts with increasing delays for mobile
        const retryAttempts = [200, 500, 1000, 2000];
        
        retryAttempts.forEach((delay, index) => {
          setTimeout(() => {
            const retryElement = document.getElementById(id);
            if (retryElement && retryElement[property] === 'Loading...') {
              retryElement[property] = value || fallback;
              Logger.log('UI', `✓ Updated ${id} on retry attempt ${index + 1} to: ${value || fallback}`);
            } else if (!retryElement) {
              Logger.error('UI', `Element ${id} still not found after retry attempt ${index + 1}`);
            }
          }, delay);
        });
      }
    } catch (error) {
      Logger.error('UI', `Failed to update ${id}`, error);
    }
  });
}

function getDefaultUserInfo() {
  return {
    created_at: new Date().toISOString(),
    last_login: null,
    revoked: false,
    login_count: 0
  };
}

function updateUserInfo(data) {
  Logger.log('UI', 'Updating user info display', data);

  const updates = [
    {
      id: 'createdAt',
      value: data?.created_at ? new Date(data.created_at).toLocaleDateString() : '—'
    },
    {
      id: 'lastLogin',
      value: data?.last_login ? new Date(data.last_login).toLocaleDateString() : '—'
    },
    {
      id: 'loginCount',
      value: String(data?.login_count ?? 0)
    }
  ];

  // Handle status with mobile-safe class manipulation and enhanced logging
  const statusEl = document.getElementById('status');
  Logger.log('UI', 'Looking for status element', { found: !!statusEl, data });
  
  if (statusEl) {
    try {
      const statusText = data?.revoked ? 'Access Revoked' : 'Whitelisted';
      const statusClass = data?.revoked ? 'status-badge status-revoked' : 'status-badge status-active';
      
      Logger.log('UI', `Setting status: ${statusText} with class: ${statusClass}`);
      
      statusEl.textContent = statusText;
      statusEl.className = statusClass;
      
      Logger.log('UI', '✓ Status updated successfully', {
        text: statusEl.textContent,
        className: statusEl.className
      });
    } catch (error) {
      Logger.error('UI', 'Failed to update status', error);
    }
  } else {
    Logger.error('UI', 'Status element not found in DOM');
    
    // Retry finding status element with delay
    setTimeout(() => {
      const retryStatusEl = document.getElementById('status');
      if (retryStatusEl) {
        const statusText = data?.revoked ? 'Access Revoked' : 'Whitelisted';
        const statusClass = data?.revoked ? 'status-badge status-revoked' : 'status-badge status-active';
        
        retryStatusEl.textContent = statusText;
        retryStatusEl.className = statusClass;
        Logger.log('UI', '✓ Status updated on retry', { text: statusText, className: statusClass });
      } else {
        Logger.error('UI', 'Status element still not found after retry');
      }
    }, 500);
  }

  // Update other user info elements with enhanced logging
  updates.forEach(({ id, value }) => {
    Logger.log('UI', `Updating ${id} with value: ${value}`);
    
    try {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
        Logger.log('UI', `✓ Updated ${id}: ${value}`);
      } else {
        Logger.warn('UI', `Element ${id} not found`);
        
        // Retry with delay
        setTimeout(() => {
          const retryElement = document.getElementById(id);
          if (retryElement) {
            retryElement.textContent = value;
            Logger.log('UI', `✓ Updated ${id} on retry: ${value}`);
          } else {
            Logger.error('UI', `Element ${id} still not found after retry`);
          }
        }, 500);
      }
    } catch (error) {
      Logger.error('UI', `Failed to update ${id}`, error);
    }
  });
}

// Mobile-optimized blueprint loading with enhanced timeout handling
async function loadBlueprints(discordId) {
  Logger.log('BLUEPRINTS', `Starting mobile-optimized blueprint load for Discord ID: ${discordId}`);

  let ownedBlueprints = [];

  try {
    ownedBlueprints = await withRetry(async () => {
      Logger.log('BLUEPRINTS', `Querying user_blueprints table for discord_id: ${discordId}`);

      // CRITICAL FIX: This query now has timeout handling via withRetry
      const { data, error } = await client
        .from('user_blueprints')
        .select('blueprint_name')
        .eq('discord_id', discordId);

      if (error) {
        Logger.error('BLUEPRINTS', 'Blueprint query error', error);
        throw error;
      }

      const blueprintNames = data?.map(d => d.blueprint_name) || [];
      Logger.log('BLUEPRINTS', `Query successful - found ${blueprintNames.length} blueprints`, blueprintNames);

      return blueprintNames;
    }, 'Mobile Blueprint Data Load', 3); // Reduced attempts since we have fallback

    Logger.log('BLUEPRINTS', `✓ Loaded ${ownedBlueprints.length} owned blueprints`);
  } catch (error) {
    Logger.error('BLUEPRINTS', 'Failed to load blueprints from database after retries', error);
    
    // Always provide empty array as fallback
    ownedBlueprints = [];
    Logger.log('BLUEPRINTS', 'Using empty blueprint array as fallback');
  }

  // Always render blueprints regardless of database success
  try {
    renderBlueprints(ownedBlueprints);
    Logger.log('BLUEPRINTS', '✓ Blueprint rendering completed');
  } catch (renderError) {
    Logger.error('BLUEPRINTS', 'Failed to render blueprints', renderError);
    
    // Show error message in blueprint container
    const container = document.getElementById('blueprintList');
    if (container) {
      container.innerHTML = '<div class="error-message">Blueprints temporarily unavailable. Please refresh the page.</div>';
    }
  }
}

// Enhanced blueprint rendering with mobile performance optimizations
function renderBlueprints(ownedBlueprints) {
  const startTime = performance.now();
  Logger.log('BLUEPRINTS', 'Starting mobile-optimized blueprint rendering');

  const container = document.getElementById('blueprintList');
  if (!container) {
    Logger.error('BLUEPRINTS', 'Blueprint container not found in DOM');
    return;
  }

  try {
    // Use requestAnimationFrame for smooth rendering on mobile
    requestAnimationFrame(() => {
      const fragment = document.createDocumentFragment();

      Object.entries(itemsByCategory).forEach(([category, items]) => {
        try {
          const group = createCategoryGroup(category, items, ownedBlueprints);
          fragment.appendChild(group);
        } catch (error) {
          Logger.error('BLUEPRINTS', `Failed to create category group for ${category}`, error);
        }
      });

      container.innerHTML = '';
      container.appendChild(fragment);

      // Defer non-critical operations with longer delay for mobile
      setTimeout(() => {
        attachBlueprintEventListeners();
        updateBlueprintCount();
      }, MobileUtils.isMobile() ? 100 : 50);

      const endTime = performance.now();
      Logger.log('BLUEPRINTS', `✓ Rendering completed in ${(endTime - startTime).toFixed(2)}ms`);
    });

  } catch (error) {
    Logger.error('BLUEPRINTS', 'Critical error in blueprint rendering', error);
    container.innerHTML = '<div class="error-message">Error loading blueprints. Please refresh the page.</div>';
  }
}

function createCategoryGroup(category, items, ownedBlueprints) {
  const group = document.createElement('details');
  group.className = 'category-group';
  group.open = false;

  const summary = document.createElement('summary');
  summary.className = 'category-header';
  summary.innerHTML = `${category} <span class="chevron">▼</span>`;
  group.appendChild(summary);

  const content = document.createElement('div');
  content.className = 'category-content';

  items.forEach(item => {
    try {
      const itemDiv = createBlueprintItem(item, category, ownedBlueprints);
      content.appendChild(itemDiv);
    } catch (error) {
      Logger.error('BLUEPRINTS', `Failed to create item ${item}`, error);
    }
  });

  group.appendChild(content);
  return group;
}

function createBlueprintItem(item, category, ownedBlueprints) {
  const itemDiv = document.createElement('div');
  itemDiv.className = 'blueprint-item';

  const label = document.createElement('div');
  label.className = 'blueprint-label';
  label.textContent = item;

  const switchWrapper = document.createElement('label');
  switchWrapper.className = 'toggle-switch';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'blueprint-checkbox';
  input.value = item;
  input.id = `toggle-${item}`;
  input.checked = ownedBlueprints.includes(item) || CONFIG.DEFAULT_ON_CATEGORIES.includes(category);

  const slider = document.createElement('span');
  slider.className = 'toggle-slider';

  switchWrapper.appendChild(input);
  switchWrapper.appendChild(slider);

  itemDiv.appendChild(label);
  itemDiv.appendChild(switchWrapper);

  return itemDiv;
}

function attachBlueprintEventListeners() {
  try {
    const checkboxes = document.querySelectorAll('#blueprintList input[type="checkbox"]');

    // Use passive event listeners for better mobile performance
    checkboxes.forEach(cb => {
      cb.addEventListener('change', updateBlueprintCount, { passive: true });
    });

    Logger.log('BLUEPRINTS', `✓ Attached event listeners to ${checkboxes.length} checkboxes`);
  } catch (error) {
    Logger.error('BLUEPRINTS', 'Failed to attach event listeners', error);
  }
}

function updateBlueprintCount() {
  try {
    const checkboxes = document.querySelectorAll('#blueprintList input[type="checkbox"]');
    const filtered = Array.from(checkboxes).filter(cb => {
      const category = cb.closest('details')?.querySelector('summary')?.textContent || '';
      return !CONFIG.DEFAULT_ON_CATEGORIES.some(c => category.includes(c));
    });

    const selected = filtered.filter(cb => cb.checked);
    const countEl = document.getElementById('blueprintCount');

    if (countEl) {
      countEl.textContent = `📃 Selected: ${selected.length} / ${filtered.length} Blueprints`;
    }
  } catch (error) {
    Logger.error('BLUEPRINTS', 'Failed to update blueprint count', error);
  }
}

// Mobile-optimized save function with batch processing and shorter timeouts
async function saveBlueprints() {
  try {
    Logger.log('SAVE', 'Starting mobile-optimized blueprint save');

    // Show loading state for mobile users
    const originalText = 'Save Blueprints';
    const saveButton = document.querySelector('button[onclick="saveBlueprints()"]');
    if (saveButton) {
      saveButton.textContent = 'Saving...';
      saveButton.disabled = true;
    }

    const checkboxes = document.querySelectorAll('#blueprintList input[type="checkbox"]');
    const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

    const user = await getAuthenticatedUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const discordId = UserUtils.getDiscordId(user);
    if (!discordId) {
      throw new Error('Could not determine Discord ID');
    }

    Logger.log('SAVE', `Saving ${selected.length} blueprints for Discord ID: ${discordId}`);

    // CRITICAL FIX: Use shorter timeout and different strategy for mobile
    const isMobile = MobileUtils.isMobile();
    const operationTimeout = isMobile ? 8000 : 12000; // 8 seconds for mobile

    if (isMobile && selected.length > 20) {
      // For mobile with many blueprints, use batch processing
      Logger.log('SAVE', 'Using mobile batch processing for large blueprint set');
      await saveBlueprintsInBatches(discordId, selected, operationTimeout);
    } else {
      // Normal save operation with timeout
      await withTimeout(
        saveBlueprintsNormal(discordId, selected),
        operationTimeout,
        'Blueprint save operation'
      );
    }

    Logger.log('SAVE', `✓ Successfully saved ${selected.length} blueprints`);

    // Show success feedback
    if (saveButton) {
      saveButton.textContent = '✓ Saved!';
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
      }, 2000);
    }

    // Use a more mobile-friendly notification
    if (MobileUtils.isMobile()) {
      alert('✓ Blueprints saved successfully!');
    } else {
      alert('Blueprints saved successfully!');
    }

  } catch (error) {
    Logger.error('SAVE', 'Failed to save blueprints', error);

    // Reset button state
    const saveButton = document.querySelector('button[onclick="saveBlueprints()"]');
    if (saveButton) {
      saveButton.textContent = 'Save Blueprints';
      saveButton.disabled = false;
    }

    const isTimeout = error.message && error.message.includes('timed out');
    const message = isTimeout && MobileUtils.isMobile() 
      ? '⚠️ Save timed out due to slow connection. Your selections are preserved - try again when connection improves.'
      : '❌ Failed to save blueprints. Please check your connection and try again.';
    
    alert(message);
  }
}

// Normal save operation
async function saveBlueprintsNormal(discordId, selected) {
  // Delete existing blueprints
  Logger.log('SAVE', 'Deleting existing blueprints');
  const { error: deleteError } = await client
    .from('user_blueprints')
    .delete()
    .eq('discord_id', discordId);

  if (deleteError) {
    Logger.error('SAVE', 'Delete operation failed', deleteError);
    throw deleteError;
  }

  // Insert new blueprints if any selected
  if (selected.length > 0) {
    Logger.log('SAVE', `Inserting ${selected.length} new blueprints`);
    const inserts = selected.map(name => ({ discord_id: discordId, blueprint_name: name }));

    const { error: insertError } = await client
      .from('user_blueprints')
      .insert(inserts);

    if (insertError) {
      Logger.error('SAVE', 'Insert operation failed', insertError);
      throw insertError;
    }
  }
}

// Mobile batch processing for large blueprint sets
async function saveBlueprintsInBatches(discordId, selected, timeoutPerBatch) {
  Logger.log('SAVE', 'Starting mobile batch save process');

  // First, clear existing blueprints with timeout
  await withTimeout(
    client.from('user_blueprints').delete().eq('discord_id', discordId),
    timeoutPerBatch,
    'Delete existing blueprints'
  );

  if (selected.length === 0) {
    Logger.log('SAVE', 'No blueprints to save');
    return;
  }

  // Process in smaller batches for mobile
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < selected.length; i += batchSize) {
    batches.push(selected.slice(i, i + batchSize));
  }

  Logger.log('SAVE', `Processing ${batches.length} batches of ${batchSize} blueprints each`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    Logger.log('SAVE', `Processing batch ${i + 1}/${batches.length} (${batch.length} items)`);

    const inserts = batch.map(name => ({ discord_id: discordId, blueprint_name: name }));

    await withTimeout(
      client.from('user_blueprints').insert(inserts),
      timeoutPerBatch,
      `Batch ${i + 1} insert`
    );

    // Small delay between batches for mobile
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  Logger.log('SAVE', 'Mobile batch processing completed successfully');
}

// Enhanced logout with mobile considerations
function logout() {
  Logger.log('LOGOUT', 'Starting mobile-aware logout process');

  // Show loading state
  const logoutButton = document.querySelector('button[onclick="logout()"]');
  if (logoutButton) {
    logoutButton.textContent = 'Logging out...';
    logoutButton.disabled = true;
  }

  client.auth.signOut()
    .then(() => {
      Logger.log('LOGOUT', '✓ Logout successful');

      // Clear any cached data
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        }).catch(() => { }); // Ignore cache clearing errors
      }

      // Force page reload on mobile to ensure clean state
      if (MobileUtils.isMobile()) {
        window.location.replace("/");
      } else {
        window.location.href = "/";
      }
    })
    .catch(error => {
      Logger.error('LOGOUT', 'Logout failed', error);

      // Reset button state
      if (logoutButton) {
        logoutButton.textContent = 'Logout';
        logoutButton.disabled = false;
      }

      alert("Failed to log out. Please try again.");
    });
}

// CRITICAL FIX: Enhanced main initialization with immediate UI updates
async function loadProfile() {
  Logger.log('INIT', 'Starting mobile-optimized profile load');

  try {
    // Step 1: Get authenticated user with longer timeout for mobile
    Logger.log('INIT', 'Step 1: Authenticating user');
    const user = await getAuthenticatedUser();
    if (!user) {
      Logger.error('INIT', 'No authenticated user, redirecting');
      window.location.href = '/';
      return;
    }

    Logger.log('INIT', '✓ User authenticated successfully', {
      userId: user.id,
      metadata: user.user_metadata,
      appMetadata: user.app_metadata
    });

    // Step 2: Load user profile data (this will update UI immediately)
    Logger.log('INIT', 'Step 2: Loading profile data');
    const discordId = await loadUserProfile(user);

    if (!discordId) {
      throw new Error('Failed to extract Discord ID from user');
    }

    Logger.log('INIT', '✓ Profile loaded successfully, Discord ID:', discordId);

    // Step 3: Load blueprints (non-blocking for UI)
    Logger.log('INIT', 'Step 3: Loading blueprints');
    
    // CRITICAL FIX: Don't let blueprint loading block the UI
    loadBlueprints(discordId).catch(error => {
      Logger.error('INIT', 'Blueprint loading failed but not blocking UI', error);
    });

    Logger.log('INIT', '✓ Profile initialization completed successfully');
    
    // CRITICAL FIX: Remove any loading indicators immediately
    setTimeout(() => {
      const loadingElements = document.querySelectorAll('.loading, [data-loading="true"], .loading-spinner');
      loadingElements.forEach(el => {
        el.style.display = 'none';
        el.remove();
      });

      // Show main content
      const mainContent = document.querySelector('main, .main-content, #main, .blueprints-section');
      if (mainContent) {
        mainContent.style.display = 'block';
        mainContent.style.visibility = 'visible';
        mainContent.style.opacity = '1';
      }
      
      Logger.log('INIT', 'UI cleanup completed - removed loading indicators');
    }, 100);

  } catch (error) {
    Logger.error('INIT', 'Critical error during profile initialization', error);

    // Still try to show basic UI even if everything fails
    Logger.log('INIT', 'Attempting to show fallback UI');
    updateUIElements({
      avatar: CONFIG.DEFAULT_AVATAR,
      username: CONFIG.FALLBACK_USERNAME,
      discordId: 'Error loading data'
    });
    
    // Show empty blueprints as fallback
    try {
      renderBlueprints([]);
    } catch (renderError) {
      Logger.error('INIT', 'Failed to render fallback blueprints', renderError);
    }

    // Show user-friendly error message with mobile-specific handling
    setTimeout(() => {
      const message = MobileUtils.isMobile() 
        ? 'Some data may take longer to load on mobile. The page is ready to use.' 
        : 'Failed to load some profile data. Please refresh if needed.';
        
      // Don't block user with confirmation on mobile - just show alert
      if (MobileUtils.isMobile()) {
        console.warn('Mobile loading warning:', message);
      } else {
        if (confirm('Failed to load profile data. Would you like to try again?')) {
          window.location.reload();
        }
      }
    }, 1000);
  }
}

// Utility function to add timeout to promises
function withTimeout(promise, ms, operation = 'Operation') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${ms}ms`));
    }, ms);

    promise
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// CRITICAL FIX: Optimized session waiting with faster mobile fallback
async function waitForSession() {
  Logger.log('SESSION', 'Starting mobile-aware session wait');
  const isMobile = MobileUtils.isMobile();
  
  // CRITICAL FIX: Much shorter timeout for initial check on mobile
  const firstAttemptTimeout = isMobile ? 3000 : 5000; // 3 seconds for mobile first attempt
  const subsequentTimeout = isMobile ? 5000 : 8000;
  const maxAttempts = isMobile ? 3 : CONFIG.SESSION_CHECK_ATTEMPTS; // Fewer attempts, faster fallback
  const delay = isMobile ? 1000 : CONFIG.SESSION_CHECK_DELAY; // Shorter delays

  Logger.log('SESSION', `Configuration - Mobile: ${isMobile}, Max attempts: ${maxAttempts}, First timeout: ${firstAttemptTimeout}ms`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      Logger.log('SESSION', `Attempt ${attempt}/${maxAttempts} - Checking session`);
      
      const timeoutMs = attempt === 1 ? firstAttemptTimeout : subsequentTimeout;
      Logger.log('SESSION', `Using ${timeoutMs}ms timeout for attempt ${attempt}`);
      
      // CRITICAL FIX: Much shorter timeout for first attempt
      const sessionPromise = client.auth.getSession();
      const { data: { session }, error } = await withTimeout(
        sessionPromise, 
        timeoutMs, 
        `Session check attempt ${attempt}`
      );

      Logger.log('SESSION', `Attempt ${attempt} result:`, {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasError: !!error,
        errorMessage: error?.message
      });

      if (session?.user) {
        Logger.log('SESSION', `✓ Session found on attempt ${attempt} (Mobile: ${isMobile})`, {
          userId: session.user.id,
          userMetadata: session.user.user_metadata,
          appMetadata: session.user.app_metadata
        });
        return session;
      }

      if (error) {
        Logger.warn('SESSION', `Session check error on attempt ${attempt}: ${error.message}`);
      } else {
        Logger.log('SESSION', `No session yet on attempt ${attempt}`);
      }

    } catch (error) {
      Logger.error('SESSION', `Session check failed on attempt ${attempt}`, {
        message: error.message,
        isTimeout: error.message.includes('timed out'),
        stack: error.stack
      });
      
      // CRITICAL FIX: On mobile, try local session immediately after first timeout
      if (error.message.includes('timed out') && isMobile) {
        Logger.log('SESSION', 'Timeout detected on mobile, trying alternative approach');
        
        try {
          const localData = MobileSessionManager.loadSessionFromLocal();
          if (localData?.session?.user) {
            Logger.log('SESSION', 'Using local session data due to timeout');
            return localData.session;
          }
        } catch (localError) {
          Logger.error('SESSION', 'Failed to get local session after timeout', localError);
        }
        
        // If first attempt times out on mobile, don't retry - go straight to fallback
        if (attempt === 1) {
          Logger.log('SESSION', 'First attempt timed out on mobile, skipping remaining attempts');
          break;
        }
      }
    }

    if (attempt < maxAttempts) {
      Logger.log('SESSION', `Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  Logger.error('SESSION', `No session found after ${maxAttempts} attempts (Mobile: ${isMobile})`);
  return null;
}

// Enhanced navigation handling with mobile considerations
async function handleNavigation() {
  Logger.log('NAVIGATION', 'Handling mobile-optimized navigation event');

  try {
    const { data: { session } } = await client.auth.getSession();
    if (session && typeof updateNavbar === 'function') {
      updateNavbar(session);
    }
  } catch (error) {
    Logger.error('NAVIGATION', 'Navigation handling failed', error);
  }
}

// CRITICAL FIX: Enhanced DOM initialization with comprehensive error tracking
document.addEventListener('DOMContentLoaded', async () => {
  Logger.log('DOM', 'DOM loaded - starting mobile-optimized initialization');

  const isMobile = MobileUtils.isMobile();
  Logger.log('DOM', `Device type: ${isMobile ? 'Mobile' : 'Desktop'}`);

  try {
    // Add mobile-specific viewport handling
    if (isMobile) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
      }
    }

    // Log DOM readiness
    Logger.log('DOM', 'Checking for required elements');
    const requiredElements = ['avatar', 'username', 'discordId', 'status'];
    const missingElements = [];
    
    requiredElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        Logger.log('DOM', `✓ Found element: ${id}`);
      } else {
        Logger.warn('DOM', `⚠️ Missing element: ${id}`);
        missingElements.push(id);
      }
    });

    if (missingElements.length > 0) {
      Logger.warn('DOM', 'Some required elements are missing, but continuing', missingElements);
    }

    // CRITICAL FIX: Wait for session with much longer timeout
    Logger.log('DOM', 'Waiting for session...');
    const session = await waitForSession();

    Logger.log('DOM', 'Session wait completed', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id
    });

    if (session?.user) {
      Logger.log('DOM', '✓ Session found, calling loadProfile');
      
      try {
        await loadProfile();
        Logger.log('DOM', '✓ loadProfile completed successfully');
      } catch (profileError) {
        Logger.error('DOM', 'loadProfile failed', profileError);
        throw profileError;
      }
    } else {
      Logger.warn('DOM', 'No session found after waiting, redirecting');
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
    
  } catch (error) {
    Logger.error('DOM', 'Critical initialization error', error);

    // Mobile-specific error recovery with better user experience
    if (isMobile) {
      setTimeout(() => {
        const message = 'Failed to initialize the app. This might be due to a slow connection. Would you like to reload the page?';
        if (confirm(message)) {
          window.location.reload();
        } else {
          window.location.href = "/";
        }
      }, 1500); // Longer delay for mobile
    } else {
      // Desktop fallback
      try {
        Logger.log('DOM', 'Attempting fallback profile load...');
        await loadProfile();
      } catch (fallbackError) {
        Logger.error('DOM', 'Fallback profile load also failed', fallbackError);
        window.location.href = "/";
      }
    }
  }
});

// Enhanced pageshow handler with mobile cache management
window.addEventListener('pageshow', async (event) => {
  const isMobile = MobileUtils.isMobile();
  const isFromCache = event.persisted || performance.getEntriesByType("navigation")[0]?.type === "back_forward";

  Logger.log('PAGESHOW', `Page event - Mobile: ${isMobile}, From Cache: ${isFromCache}`);

  if (isFromCache) {
    Logger.log('PAGESHOW', 'Page restored from cache, forcing refresh on mobile');

    // Mobile browsers often have stale session data when returning from cache
    if (isMobile) {
      try {
        // Force session refresh on mobile cache restore
        await client.auth.refreshSession();
        Logger.log('PAGESHOW', 'Mobile session refreshed from cache');
      } catch (error) {
        Logger.warn('PAGESHOW', 'Failed to refresh session from cache', error);
      }
    }

    await handleNavigation();
  }
});

// Enhanced online/offline handling for mobile networks
window.addEventListener('online', async () => {
  const isMobile = MobileUtils.isMobile();
  Logger.log('NETWORK', `Back online - Mobile: ${isMobile}`);

  if (isMobile) {
    // Mobile networks can be flaky, give a small delay then retry operations
    setTimeout(async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          Logger.log('NETWORK', 'Connection restored, reloading profile data');
          await loadProfile();
        }
      } catch (error) {
        Logger.error('NETWORK', 'Failed to reload data after reconnection', error);
      }
    }, 2000); // Longer delay for mobile
  }
});

window.addEventListener('offline', () => {
  const isMobile = MobileUtils.isMobile();
  Logger.warn('NETWORK', `Connection lost - Mobile: ${isMobile}`);

  // Show offline indicator for mobile users
  if (isMobile) {
    const offlineIndicator = document.createElement('div');
    offlineIndicator.id = 'offline-indicator';
    offlineIndicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      text-align: center;
      padding: 8px;
      z-index: 9999;
      font-size: 14px;
    `;
    offlineIndicator.textContent = '📶 Connection lost - Some features may not work';
    document.body.appendChild(offlineIndicator);
  }
});

// Mobile-specific visibility change handler for app backgrounding
document.addEventListener('visibilitychange', async () => {
  const isMobile = MobileUtils.isMobile();

  if (!document.hidden && isMobile) {
    Logger.log('VISIBILITY', 'Mobile app returned to foreground');

    // Mobile apps often lose WebSocket connections when backgrounded
    try {
      const { data: { session }, error } = await client.auth.getSession();

      if (error || !session) {
        Logger.warn('VISIBILITY', 'Session lost while app was backgrounded, refreshing');
        await client.auth.refreshSession();
      }
    } catch (error) {
      Logger.error('VISIBILITY', 'Failed to check session on app foreground', error);
    }
  }
});

// Enhanced error boundary for mobile debugging
window.addEventListener('error', (event) => {
  const isMobile = MobileUtils.isMobile();
  Logger.error('GLOBAL_ERROR', `Unhandled error on ${isMobile ? 'mobile' : 'desktop'}`, {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });

  // On mobile, show user-friendly error message
  if (isMobile && (event.message.includes('Supabase') || event.message.includes('fetch'))) {
    setTimeout(() => {
      if (confirm('Connection issue detected. Reload page?')) {
        window.location.reload();
      }
    }, 500);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const isMobile = MobileUtils.isMobile();
  Logger.error('UNHANDLED_PROMISE', `Unhandled promise rejection on ${isMobile ? 'mobile' : 'desktop'}`, event.reason);

  // Prevent the default console.error behavior
  event.preventDefault();

  // Handle common mobile-specific promise rejections
  if (isMobile && event.reason?.message?.includes('fetch')) {
    Logger.warn('UNHANDLED_PROMISE', 'Mobile network error detected, will retry on next user action');
  }
});

// Mobile-specific touch event optimizations
if (MobileUtils.isMobile()) {
  // Improve mobile checkbox interactions
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const checkboxes = document.querySelectorAll('.blueprint-checkbox');
      checkboxes.forEach(checkbox => {
        // Add larger touch target for mobile
        const parent = checkbox.closest('.toggle-switch');
        if (parent) {
          parent.style.cssText += `
            min-height: 44px;
            min-width: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
          `;
        }
      });
    }, 100);
  });

  // Improve mobile scrolling performance
  document.addEventListener('touchstart', () => { }, { passive: true });
  document.addEventListener('touchmove', () => { }, { passive: true });
}

// Mobile-optimized connection testing
async function testMobileConnection() {
  if (!MobileUtils.isMobile()) return true;

  try {
    Logger.log('CONNECTION_TEST', 'Testing mobile connection to Supabase');

    const startTime = performance.now();
    const { data, error } = await client.from('users').select('discord_id').limit(1);
    const endTime = performance.now();

    const responseTime = endTime - startTime;
    Logger.log('CONNECTION_TEST', `Mobile connection test: ${responseTime.toFixed(0)}ms`);

    if (error) {
      Logger.error('CONNECTION_TEST', 'Mobile connection test failed', error);
      return false;
    }

    if (responseTime > CONFIG.MOBILE_TIMEOUT) {
      Logger.warn('CONNECTION_TEST', 'Mobile connection is slow', { responseTime });
    }

    return true;
  } catch (error) {
    Logger.error('CONNECTION_TEST', 'Mobile connection test error', error);
    return false;
  }
}

// Mobile-specific initialization with connection testing
async function initializeMobile() {
  if (!MobileUtils.isMobile()) return;

  Logger.log('MOBILE_INIT', 'Starting mobile-specific initialization');

  try {
    // Test connection first
    const isConnected = await testMobileConnection();

    if (!isConnected) {
      Logger.warn('MOBILE_INIT', 'Poor mobile connection detected, adjusting timeouts');
      CONFIG.MOBILE_TIMEOUT *= 2;
      CONFIG.MAX_RETRY_ATTEMPTS += 3;
    }

    // Mobile-specific Supabase client options
    if (MobileUtils.hasSlowConnection()) {
      Logger.log('MOBILE_INIT', 'Slow connection detected, optimizing for low bandwidth');
    }

    Logger.log('MOBILE_INIT', 'Mobile initialization completed');
  } catch (error) {
    Logger.error('MOBILE_INIT', 'Mobile initialization failed', error);
  }
}

// Call mobile initialization early
if (MobileUtils.isMobile()) {
  initializeMobile();
}

// Enhanced mobile debugging helper
if (MobileUtils.isMobile() && window.location.search.includes('debug=true')) {
  // Create mobile debug panel
  const createMobileDebugPanel = () => {
    const panel = document.createElement('div');
    panel.id = 'mobile-debug-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      max-height: 200px;
      overflow-y: auto;
    `;

    const update = () => {
      const info = [
        `Device: ${MobileUtils.isIOS() ? 'iOS' : MobileUtils.isAndroid() ? 'Android' : 'Mobile'}`,
        `Connection: ${MobileUtils.hasSlowConnection() ? 'Slow' : 'Normal'}`,
        `User Agent: ${navigator.userAgent.substring(0, 50)}...`,
        `Viewport: ${window.innerWidth}x${window.innerHeight}`,
        `Online: ${navigator.onLine}`,
        `Timeout: ${CONFIG.MOBILE_TIMEOUT}ms`
      ];
      panel.innerHTML = info.join('<br>');
    };

    update();
    setInterval(update, 5000);
    document.body.appendChild(panel);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createMobileDebugPanel);
  } else {
    createMobileDebugPanel();
  }
}

// Global function exposure with mobile context
window.saveBlueprints = saveBlueprints;
window.logout = logout;
window.loadProfile = loadProfile;

// Mobile-specific global error recovery
window.mobileReconnect = async function () {
  if (!MobileUtils.isMobile()) return;

  Logger.log('MOBILE_RECONNECT', 'Manual mobile reconnection initiated');

  try {
    // Clear any offline indicators
    const offlineIndicator = document.getElementById('offline-indicator');
    if (offlineIndicator) {
      offlineIndicator.remove();
    }

    // Force session refresh
    await client.auth.refreshSession();

    // Reload profile data
    await loadProfile();

    Logger.log('MOBILE_RECONNECT', 'Mobile reconnection successful');
    alert('✓ Reconnected successfully!');
  } catch (error) {
    Logger.error('MOBILE_RECONNECT', 'Mobile reconnection failed', error);
    alert('❌ Failed to reconnect. Please refresh the page.');
  }
};

Logger.log('SCRIPT_LOADED', `Mobile-optimized profile script loaded - Mobile: ${MobileUtils.isMobile()}`);