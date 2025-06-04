// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const CONFIG = {
    SUPABASE_URL: 'https://dsexkdjxmhgqahrlkvax.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzZXhrZGp4bWhncWFocmxrdmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODAxNTAsImV4cCI6MjA2NDA1NjE1MH0.RW_ROpcNUNZaK9xGH2OFwHBSmFsGrLj-yi3LWCPBCvA',
    MOBILE_SESSION_KEY: 'mobile_user_session',
    MOBILE_ACCESS_KEY: 'mobile_user_access',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    ADMIN_DISCORD_IDS: [
        "154388953053659137",
        "344637470908088322",
        "796587763851198474",
        "492053410967846933",
        "487476487386038292"
    ],
    MOBILE_BREAKPOINT: 768,
    RETRY_ATTEMPTS: 5,
    RETRY_DELAY: 300
};

// Heartbeat System -- Updates ONLINE users in Admin Dashboard
setInterval(async () => {
    const session = await client.auth.getSession();
    if (session?.data?.session) {
        await client.from('users').update({ last_login: new Date().toISOString() }).eq('discord_id', session.data.session.user.user_metadata.provider_id);
    }
}, 2 * 60 * 1000);


// =============================================================================
// GLOBAL STATE
// =============================================================================

let client = null;
let currentSession = null;
let userHasAccess = false;
let isInitialized = false;
let authStateListenerSet = false;
let navbarUpdateInProgress = false;

// Cache DOM elements
const domCache = {
    navbar: null,
    unlockPlusBtn: null
};


// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const Utils = {
    // Optimized mobile detection with caching
    isMobile: (() => {
        let cached = null;
        return () => {
            if (cached === null) {
                cached = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
            }
            return cached;
        };
    })(),

    // Debounced function helper
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Safe async wrapper
    async safeAsync(asyncFn, fallback = null) {
        try {
            return await asyncFn();
        } catch (error) {
            console.error(`[❌ SAFE] Error in async operation:`, error);
            return fallback;
        }
    },

    // Wait for DOM element
    waitForElement(selector, timeout = 3000) {
        return new Promise((resolve, reject) => {
            // Check if element already exists
            const existing = document.querySelector(selector);
            if (existing) return resolve(existing);

            let elapsed = 0;
            const interval = 100;

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Fallback timeout
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found after ${timeout}ms`));
            }, timeout);
        });
    },

    // DOM ready helper
    onDOMReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }
};

// =============================================================================
// CACHE MANAGER
// =============================================================================
const CacheManager = {
    cache: new Map(),

    set(key, value, ttl = 300000) { // 5 minutes default
        const expiry = Date.now() + ttl;
        this.cache.set(key, { value, expiry });
    },

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    },

    // Cache user access checks
    async getCachedUserAccess(discordId) {
        const cacheKey = `access_${discordId}`;
        const cached = this.get(cacheKey);

        if (cached !== null) return cached;

        const access = await checkUserAccess(currentSession);
        this.set(cacheKey, access, 60000); // Cache for 1 minute
        return access;
    }
};

// =============================================================================
// SUPABASE CLIENT INITIALIZATION
// =============================================================================

async function initializeSupabaseClient() {
    try {
        client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        console.log("[⚙️ INIT] Supabase client created successfully");
        return true;
    } catch (error) {
        console.error("[❌ INIT] Failed to create Supabase client:", error.message);
        return false;
    }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

const SessionManager = {
    async validateAndRefresh() {
        if (!currentSession?.expires_at) return false;

        const expiresAt = new Date(currentSession.expires_at * 1000);
        const now = new Date();
        const timeToExpiry = expiresAt.getTime() - now.getTime();

        if (timeToExpiry < 10 * 60 * 1000) {
            const { data, error } = await client.auth.refreshSession();
            if (!error && data.session) {
                currentSession = data.session;
                return true;
            }
        }
        return false;
    },

    persist(session, hasAccess) {
        if (!session?.user) return;

        try {
            const sessionData = {
                user: {
                    id: session.user.id,
                    user_metadata: session.user.user_metadata
                },
                expires_at: session.expires_at,
                timestamp: Date.now()
            };
            localStorage.setItem(CONFIG.MOBILE_SESSION_KEY, JSON.stringify(sessionData));
            localStorage.setItem(CONFIG.MOBILE_ACCESS_KEY, hasAccess.toString());
            console.log("[💾 SESSION] Session persisted to localStorage");
        } catch (error) {
            console.error("[❌ SESSION] Failed to persist session:", error);
        }
    },

    load() {
        try {
            const sessionData = localStorage.getItem(CONFIG.MOBILE_SESSION_KEY);
            const accessData = localStorage.getItem(CONFIG.MOBILE_ACCESS_KEY);

            if (!sessionData) return null;

            const parsed = JSON.parse(sessionData);
            const isStale = Date.now() - (parsed.timestamp || 0) > CONFIG.SESSION_TIMEOUT;

            if (isStale) {
                this.clear();
                return null;
            }

            console.log("[📱 SESSION] Loaded session from localStorage");
            return {
                session: parsed,
                hasAccess: accessData === 'true'
            };
        } catch (error) {
            console.error("[❌ SESSION] Failed to load session:", error);
            return null;
        }
    },

    clear() {
        try {
            localStorage.removeItem(CONFIG.MOBILE_SESSION_KEY);
            localStorage.removeItem(CONFIG.MOBILE_ACCESS_KEY);
            console.log("[🧹 SESSION] Local session data cleared");
        } catch (error) {
            console.error("[❌ SESSION] Error clearing session:", error);
        }
    },

    async getCurrent(retries = CONFIG.RETRY_ATTEMPTS) {
        if (!client) return null;

        for (let i = 0; i < retries; i++) {
            try {
                const { data: { session }, error } = await client.auth.getSession();
                if (error) throw error;
                if (session?.user) return session;
            } catch (error) {
                console.error(`[❌ SESSION] Attempt ${i + 1} failed:`, error);
            }

            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            }
        }

        if (Utils.isMobile()) {
            const localData = this.load();
            return localData?.session || null;
        }

        return null;
    }
};

// =============================================================================
// ACCESS CONTROL
// =============================================================================

const AccessManager = {
    subscription: null,

    // Manually check user access during login/init
    async check(session) {
        console.log("[🔍 ACCESS] Checking user access for session:", session?.user?.id);

        if (!session?.user) {
            userHasAccess = false;
            return false;
        }

        try {
            const discordId = session.user.user_metadata.provider_id || session.user.user_metadata.sub;
            console.log("[🔍 ACCESS] Checking access for Discord ID:", discordId);

            const { data, error } = await client
                .from('users')
                .select('revoked, hub_trial, trial_expiration')
                .eq('discord_id', discordId)
                .single();

            if (error) {
                console.error("[❌ ACCESS] Error checking user access:", error.message);
                userHasAccess = false;
                return false;
            }

            if (!data) {
                console.log("[🔍 ACCESS] No user data found");
                userHasAccess = false;
                return false;
            }

            const now = new Date();
            const trialActive = data.hub_trial && new Date(data.trial_expiration) > now;
            const hasAccess = data.revoked === false || trialActive;

            console.log("[🔍 ACCESS] Access check result:", {
                revoked: data.revoked,
                hubTrial: data.hub_trial,
                trialActive,
                hasAccess
            });

            userHasAccess = hasAccess;
            SessionManager.persist(session, hasAccess); // Save for mobile
            UIManager.updateButtons();
            UIManager.updateUnlockPlusButton();

            return hasAccess;
        } catch (error) {
            console.error("[❌ ACCESS] Exception checking user access:", error);
            userHasAccess = false;
            return false;
        }
    },

    // Setup real-time subscription for access changes
    setupRealtimeUpdates() {
        if (!currentSession?.user) return;

        const discordId = currentSession.user.user_metadata.provider_id;

        this.subscription = client
            .channel('user-access-changes')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `discord_id=eq.${discordId}`
            }, (payload) => {
                console.log('[🔄 REALTIME] Access changed:', payload);
                this.handleAccessChange(payload.new);
            })
            .subscribe();
    },

    // Handle incoming realtime updates to access
    handleAccessChange(userData) {
        const now = new Date();
        const trialActive = userData.hub_trial && new Date(userData.trial_expiration) > now;
        const hasAccess = userData.revoked === false || trialActive;

        if (userHasAccess !== hasAccess) {
            userHasAccess = hasAccess;
            SessionManager.persist(currentSession, hasAccess); // Keep mobile cache in sync
            UIManager.updateButtons();
            UIManager.updateUnlockPlusButton();
            this.showAccessNotification(hasAccess);
        }
    },

    // Optional: display notification for access change
    showAccessNotification(hasAccess) {
        const message = hasAccess
            ? "✅ Your access has been granted or extended!"
            : "⚠️ Your access has been revoked or expired.";
        alert(message); // Replace with custom UI later if needed
    }
};

// =============================================================================
// UI UPDATES
// =============================================================================

const UIManager = {
    // Update button states based on access
    updateButtons() {
        console.log("[🔄 UI] Updating button states. Access:", userHasAccess);

        const restrictedButtons = document.querySelectorAll('.cta-button[data-requires-access="true"]');

        restrictedButtons.forEach(button => {
            if (userHasAccess) {
                // Unlock button
                button.classList.remove('locked', 'loading');
                button.style.cssText = `
                    pointer-events: auto;
                    opacity: 1;
                    background: linear-gradient(135deg, #00c6ff, #0072ff);
                    border: none;
                    color: #fff;
                `;

                // Remove lock overlay
                const lockOverlay = button.querySelector('.lock-overlay');
                if (lockOverlay) lockOverlay.remove();

                console.log("[✅ UI] Unlocked button:", button.href || button.textContent);
            } else {
                // Lock button
                button.classList.add('locked');
                button.classList.remove('loading');
                button.style.cssText = `
                    pointer-events: none;
                    opacity: 0.6;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: #888;
                `;

                // Add lock overlay
                if (!button.querySelector('.lock-overlay')) {
                    const lockOverlay = document.createElement('span');
                    lockOverlay.className = 'lock-overlay';
                    lockOverlay.textContent = '🔒';
                    button.appendChild(lockOverlay);
                }

                console.log("[🔒 UI] Locked button:", button.href || button.textContent);
            }
        });
    },

    // Update unlock plus button
    updateUnlockPlusButton() {
        const btn = domCache.unlockPlusBtn || document.getElementById('unlockPlusBtn');
        if (btn) {
            domCache.unlockPlusBtn = btn;
            btn.style.display = userHasAccess ? 'none' : 'inline-block';
        }
    },

    // Enhanced navbar update with proper session persistence
    updateNavbar(session) {
        if (navbarUpdateInProgress) {
            console.log("[⚠️ UI] Navbar update in progress, queuing...");
            setTimeout(() => this.updateNavbar(session), 100);
            return;
        }

        navbarUpdateInProgress = true;

        try {
            console.log("[🔄 UI] Updating navbar with session:", session?.user?.id);

            const nav = domCache.navbar || document.querySelector('.navbar');
            if (!nav) {
                console.error("[❌ UI] Navbar not found");
                return;
            }
            domCache.navbar = nav;

            // Clear existing elements
            const existingElements = nav.querySelectorAll('.profile-info, .login-button');
            existingElements.forEach(el => el.remove());

            if (!session?.user) {
                this._createLoginButton(nav);
            } else {
                this._createUserProfile(nav, session);
            }

            console.log("[✅ UI] Navbar updated successfully");
        } catch (error) {
            console.error("[❌ UI] Error updating navbar:", error);
        } finally {
            navbarUpdateInProgress = false;
        }
    },

    // Create login button
    _createLoginButton(nav) {
        const loginBtn = document.createElement('button');
        loginBtn.classList.add('login-button');
        loginBtn.textContent = 'Login with Discord';
        loginBtn.setAttribute('aria-label', 'Login with Discord');

        loginBtn.onclick = async () => {
            console.log("[🚪 AUTH] Starting Discord login...");
            await client.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: window.location.href
                }
            });
        };

        nav.appendChild(loginBtn);
    },

    // Create user profile with enhanced mobile support
    _createUserProfile(nav, session) {
        const user = session.user;
        const discordId = user.user_metadata.provider_id || user.user_metadata.sub;
        const username = user.user_metadata.full_name || 'Discord User';
        const avatarUrl = user.user_metadata.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';

        const userProfile = document.createElement('div');
        userProfile.classList.add('profile-info');
        userProfile.innerHTML = `
            <img src="${avatarUrl}" alt="User Avatar" style="width:32px;height:32px;border-radius:50%;" aria-label="User profile picture">
            <span id="profileName" aria-label="User profile">${username}</span>
            <div id="profileMenu" class="profile-menu">
                ${CONFIG.ADMIN_DISCORD_IDS.includes(discordId) ? '<a href="admin.html">Admin Suite</a>' : ''}
                <a href="profile.html">View Profile</a>
                <button class="logout-button">Logout</button>
            </div>
        `;

        // Enhanced avatar loading
        this._setupAvatarLoading(userProfile, avatarUrl);

        // Setup profile menu
        this._setupProfileMenu(userProfile);

        nav.appendChild(userProfile);
    },

    // Setup avatar loading with fallback
    _setupAvatarLoading(userProfile, avatarUrl) {
        const img = userProfile.querySelector('img');

        const loadAvatar = () => {
            const tempImg = new Image();
            tempImg.onload = () => {
                img.src = tempImg.src;
                console.log("[🖼️ UI] Avatar loaded successfully");
            };
            tempImg.onerror = () => {
                console.log("[🖼️ UI] Avatar failed to load, using fallback");
                img.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
            };
            tempImg.src = avatarUrl;
        };

        // Set fallback immediately, then try to load actual avatar
        img.src = 'https://cdn.discordapp.com/embed/avatars/0.png';

        // Immediate load attempt
        loadAvatar();

        // Mobile-specific retry mechanism
        if (Utils.isMobile()) {
            setTimeout(() => {
                if (!img.complete || img.naturalHeight === 0) {
                    console.log("[📱 MOBILE] Retrying avatar load for mobile");
                    loadAvatar();
                }
            }, 1000);
        }
    },

    // Setup profile menu with mobile optimization
    _setupProfileMenu(userProfile) {
        const profileName = userProfile.querySelector('#profileName');
        const profileMenu = userProfile.querySelector('#profileMenu');

        const toggleMenu = (e) => {
            e.stopPropagation();
            e.preventDefault();
            profileMenu.classList.toggle('show');
        };

        // Enhanced event handling for mobile
        profileName.addEventListener('click', toggleMenu);
        if (Utils.isMobile()) {
            profileName.addEventListener('touchend', toggleMenu, { passive: false });
        }

        // Click outside to close
        const closeHandler = (e) => {
            if (!userProfile.contains(e.target)) {
                profileMenu.classList.remove('show');
            }
        };

        document.addEventListener('click', closeHandler);
        if (Utils.isMobile()) {
            document.addEventListener('touchend', closeHandler);
        }

        // Setup logout button
        this._setupLogoutButton(userProfile);
    },

    // Setup logout button with proper event handling
    _setupLogoutButton(userProfile) {
        const profileMenu = userProfile.querySelector('#profileMenu');
        const logoutBtn = userProfile.querySelector('.logout-button');

        if (!logoutBtn) return;

        const handleLogout = async (e) => {
            e.preventDefault();
            e.stopPropagation();

            profileMenu.classList.remove('show');
            logoutBtn.disabled = true;
            logoutBtn.textContent = 'Logging out...';

            try {
                await AuthManager.logout();
            } catch (error) {
                console.error("[❌ UI] Logout error:", error);
                logoutBtn.disabled = false;
                logoutBtn.textContent = 'Logout';
            }
        };

        logoutBtn.addEventListener('click', handleLogout);
        if (Utils.isMobile()) {
            logoutBtn.addEventListener('touchend', handleLogout);
        }
    }
};

// =============================================================================
// AUTHENTICATION MANAGER
// =============================================================================

const AuthManager = {
    // Setup auth state listener
    setupListener() {
        if (authStateListenerSet || !client) return;

        authStateListenerSet = true;
        console.log("[📶 AUTH] Setting up auth state listener");

        client.auth.onAuthStateChange(async (event, session) => {
            console.log("[📶 AUTH] State changed:", event, "Session:", session?.user?.id);

            // Update current session immediately
            currentSession = session;

            // Check access and setup realtime if needed
            if (session?.user) {
                const hasAccess = await AccessManager.check(session);
                if (hasAccess) {
                    AccessManager.setupRealtimeUpdates();
                }

                // Handle sign-in RPC call
                if (event === "SIGNED_IN") {
                    await this.handleSignIn(session);
                }
            } else {
                userHasAccess = false;
            }

            // Update UI with proper timing - don't wait for DOM if already loaded
            const updateUI = () => {
                UIManager.updateNavbar(session);
                UIManager.updateButtons();
                UIManager.updateUnlockPlusButton();
            };

            if (document.readyState === 'complete') {
                updateUI();
            } else {
                setTimeout(updateUI, 100);
            }
        });
    },

    // Handle sign-in RPC
    async handleSignIn(session) {
        const discordId = session.user.user_metadata.provider_id || session.user.user_metadata.sub;
        const username = session.user.user_metadata.full_name || 'Discord User';

        try {
            const { data, error } = await client.rpc('upsert_user_login', {
                target_discord_id: discordId,
                user_name: username
            });
            if (error) throw error;
            console.log("[✅ RPC] upsert_user_login result:", data);
        } catch (error) {
            console.error("[❌ RPC] Upsert error:", error.message);
        }
    },

    // Enhanced logout function
    async logout() {
        console.log("[🔁 AUTH] Starting logout process...");

        try {
            // Sign out from Supabase
            const { error } = await client.auth.signOut();
            if (error) console.error("[❌ AUTH] Supabase signout error:", error.message);
        } catch (error) {
            console.error("[❌ AUTH] Exception during signout:", error);
        }

        // Clear all state
        currentSession = null;
        userHasAccess = false;
        SessionManager.clear();

        // Clear all storage
        try {
            localStorage.clear();
            sessionStorage.clear();

            // Clear cookies
            document.cookie.split(";").forEach(cookie => {
                const [name] = cookie.split("=");
                document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            });

            console.log("[✅ AUTH] All storage cleared");
        } catch (error) {
            console.error("[❌ AUTH] Error clearing storage:", error);
        }

        // Force reload
        console.log("[🔁 AUTH] Reloading page...");
        window.location.reload();
    }
};

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

async function initializeApp() {
    if (isInitialized) {
        console.log("[⚠️ INIT] App already initialized, skipping...");
        return;
    }

    console.log("[⚙️ INIT] Starting application initialization...");
    isInitialized = true;

    try {
        // Initialize Supabase client
        const clientReady = await initializeSupabaseClient();
        if (!clientReady) throw new Error("Failed to initialize Supabase client");

        // Setup auth listener FIRST
        AuthManager.setupListener();

        // Get current session
        currentSession = await SessionManager.getCurrent();
        console.log("[⚙️ INIT] Current session:", currentSession?.user?.id || 'none');

        // Check user access if we have a session
        if (currentSession) {
            await AccessManager.check(currentSession);
        }

        // Wait for navbar to be ready, then update UI
        await Utils.waitForElement(".navbar");

        // Initial UI update with delay to ensure DOM is ready
        setTimeout(() => {
            UIManager.updateNavbar(currentSession);
            UIManager.updateButtons();
            UIManager.updateUnlockPlusButton();
        }, 100);

        // Additional mobile-specific UI updates
        // Additional mobile-specific UI updates with multiple attempts
        if (Utils.isMobile()) {
            setTimeout(() => UIManager.updateNavbar(currentSession), 500);
            // Multiple update attempts for mobile reliability
            requestAnimationFrame(() => {
                UIManager.updateNavbar(currentSession);
                setTimeout(() => UIManager.updateNavbar(currentSession), 500);
            });
        }

        console.log("[✅ INIT] Application initialized successfully. User access:", userHasAccess);

    } catch (error) {
        console.error("[❌ INIT] Failed to initialize application:", error);
        isInitialized = false; // Allow retry
    }
}

// =============================================================================
// EVENT LISTENERS & PAGE LIFECYCLE
// =============================================================================

// Debounced initialization to prevent multiple calls
const debouncedInit = Utils.debounce(initializeApp, 100);

// Primary initialization events
Utils.onDOMReady(debouncedInit);
window.addEventListener('load', debouncedInit, { once: true });

// Page lifecycle handling
window.addEventListener('pageshow', (event) => {
    console.log("[📄 LIFECYCLE] Page shown, persisted:", event.persisted);

    if (event.persisted || Utils.isMobile()) {
        console.log("[📄 LIFECYCLE] Page restored or mobile device, re-initializing...");

        // For mobile or cached pages, try to restore from localStorage first
        if (Utils.isMobile()) {
            const localData = SessionManager.load();
            if (localData) {
                currentSession = localData.session;
                userHasAccess = localData.hasAccess;

                // Force UI update with multiple attempts
                setTimeout(() => {
                    UIManager.updateNavbar(currentSession);
                    UIManager.updateButtons();
                    UIManager.updateUnlockPlusButton();
                }, 100);
            }
        }

        // Reset initialization flag and re-initialize
        isInitialized = false;
        debouncedInit();
    }
});

// Mobile-specific events
if (Utils.isMobile()) {
    // Visibility change
    // Mobile-specific visibility change handling
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Utils.isMobile() && currentSession?.user) {
            console.log("[📱 MOBILE] Page became visible, checking session...");
            setTimeout(() => {
                updateNavbar(currentSession);
            }, 200);
        }
    });

    // Orientation change
    window.addEventListener('orientationchange', () => {
        console.log("[📱 MOBILE] Orientation changed, updating UI...");
        setTimeout(() => {
            if (currentSession?.user) {
                UIManager.updateNavbar(currentSession);
            }
        }, 300);
    });
}

// Force unlock loading state
setTimeout(() => {
    const buttons = document.querySelectorAll('.cta-button');
    buttons.forEach(btn => btn.classList.remove('loading'));
}, 250);

// Safari-specific handling for back/forward cache
window.addEventListener("pageshow", function (event) {
    const restored = event.persisted || (window.performance?.navigation?.type === 2);
    const jsVersionElement = document.getElementById("js-version");
    const lastVersion = window.sessionStorage?.getItem("lastJsVersion");
    const reloaded = jsVersionElement && lastVersion === jsVersionElement.textContent;

    if (restored && !isInitialized && !reloaded && !Utils.isMobile()) {
        console.warn("[♻️ SAFARI] Forcing reload due to cache restore...");
        if (jsVersionElement) {
            window.sessionStorage?.setItem("lastJsVersion", jsVersionElement.textContent);
        }
        location.reload();
    }
});

// =============================================================================
// GLOBAL EXPORTS (if needed)
// =============================================================================

// Make key functions available globally if needed by other scripts
window.AuthSystem = {
    getCurrentSession: () => currentSession,
    hasUserAccess: () => userHasAccess,
    logout: AuthManager.logout,
    forceUIUpdate: () => {
        UIManager.updateNavbar(currentSession);
        UIManager.updateButtons();
        UIManager.updateUnlockPlusButton();
    }
};