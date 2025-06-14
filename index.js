// Authentication Manager
class AuthManager {
    constructor() {
        this.client = null;
        this.isInitialized = false;
        this.authStateListenerSet = false;
        this.userHasAccess = false;
        this.currentSession = null;
        this.navbarUpdateInProgress = false;

        // Constants
        this.MOBILE_SESSION_KEY = 'mobile_user_session';
        this.MOBILE_ACCESS_KEY = 'mobile_user_access';
        this.ADMIN_DISCORD_IDS = [
            "154388953053659137",
            "344637470908088322",
            "796587763851198474",
            "492053410967846933",
            "487476487386038292"
        ];

        // Initialize Supabase client
        this.initializeSupabase();
        
        // Initialize after a small delay to ensure DOM is ready
        setTimeout(() => this.initialize(), 100);
    }

    initializeSupabase() {
        try {
            this.client = supabase.createClient(
                'https://dsexkdjxmhgqahrlkvax.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzZXhrZGp4bWhncWFocmxrdmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODAxNTAsImV4cCI6MjA2NDA1NjE1MH0.RW_ROpcNUNZaK9xGH2OFwHBSmFsGrLj-yi3LWCPBCvA'
            );
        } catch (error) {
            console.error("[❌ INIT] Failed to create Supabase client:", error.message);
        }
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 768;
    }

    // Helper function to determine if this is a genuine login event
    isGenuineLoginEvent(source) {
        const genuineLoginSources = [
            'genuine_login',        // Real Discord OAuth login
            'auth_sign_in',        // Supabase SIGNED_IN event
            'oauth_callback'       // Coming back from OAuth
        ];
        
        const notGenuineLoginSources = [
            'access_check',        // Just checking if user has access
            'initialization',      // App startup/page load
            'page_refresh',        // Page refresh
            'session_restore',     // Restoring cached session
            'token_refresh',       // Token refresh (not new login)
            'mobile_session_restore' // Mobile session restore
        ];
        
        if (genuineLoginSources.includes(source)) {
            return true;
        }
        
        if (notGenuineLoginSources.includes(source)) {
            return false;
        }
        
        // Default: be conservative and don't track
        console.log(`[⚠️ LOGIN] Unknown source '${source}' - not tracking to be safe`);
        return false;
    }

    // UPDATED: Login tracking function with validation
    async trackUserLogin(session, source = 'unknown') {
        if (!session?.user) {
            console.log("[🔍 LOGIN] No session to track");
            return;
        }

        // ✅ CRITICAL: Only track if this is actually a new login scenario
        const shouldTrackLogin = this.isGenuineLoginEvent(source);
        
        if (!shouldTrackLogin) {
            console.log(`[⏭️ LOGIN] Skipping login tracking for ${source} - not a genuine login`);
            return;
        }

        try {
            const discordId = session.user.user_metadata.provider_id || session.user.user_metadata.sub;
            const username = session.user.user_metadata.full_name || 'Discord User';

            console.log(`[📊 LOGIN] Tracking GENUINE login from ${source}:`, { discordId, username });

            const result = await this.client.rpc('upsert_user_login', {
                target_discord_id: discordId,
                user_name: username
            });

            console.log("[✅ LOGIN] Login tracked successfully:", result);
            
            // Log the debug info if available
            if (result?.data?.debug) {
                console.log("[🐛 LOGIN] Debug info:", result.data.debug);
            }
            
            // Log whether count was incremented
            if (result?.data?.login_count_incremented) {
                console.log("[📈 LOGIN] Login count was incremented to:", result.data.debug?.current_login_count);
            } else {
                console.log("[⏭️ LOGIN] Login count was NOT incremented (within time threshold)");
            }

        } catch (err) {
            console.error("[❌ LOGIN] Failed to track login:", err.message);
            console.error("[❌ LOGIN] Full error:", err);
        }
    }

    // UPDATED: Initialization method (removed login tracking)
    async initialize() {
        console.log("[🚀 AUTH] Initializing AuthManager");

        // Set up auth listener first
        this.setupAuthListener();

        try {
            // Check for existing session
            const { data: { session }, error } = await this.client.auth.getSession();
            
            if (error) {
                console.error("[❌ AUTH] Error getting session:", error);
                return;
            }

            if (session?.user) {
                console.log("[🔍 AUTH] Found existing session during initialization");
                // ✅ REMOVED: Don't track login during initialization - this is just session restoration
                // await this.trackUserLogin(session, 'initialization');  // ❌ REMOVED
                await this.checkUserAccess(session);
            }

            this.isInitialized = true;
        } catch (error) {
            console.error("[❌ AUTH] Initialization error:", error);
        }
    }

    // Session persistence methods
    persistSessionToLocal(session, hasAccess) {
        if (!session?.user) return;

        try {
            const sessionData = {
                user: {
                    id: session.user.id,
                    user_metadata: session.user.user_metadata
                },
                timestamp: Date.now()
            };
            localStorage.setItem(this.MOBILE_SESSION_KEY, JSON.stringify(sessionData));
            localStorage.setItem(this.MOBILE_ACCESS_KEY, hasAccess.toString());
            console.log("[💾 MOBILE] Session persisted");
        } catch (error) {
            console.error("[❌ MOBILE] Failed to persist session:", error);
        }
    }

    loadSessionFromLocal() {
        try {
            const sessionData = localStorage.getItem(this.MOBILE_SESSION_KEY);
            const accessData = localStorage.getItem(this.MOBILE_ACCESS_KEY);

            if (!sessionData) return null;

            const parsed = JSON.parse(sessionData);
            const timestamp = parsed.timestamp || 0;
            const isStale = Date.now() - timestamp > 24 * 60 * 60 * 1000; // 24 hours

            if (isStale) {
                localStorage.removeItem(this.MOBILE_SESSION_KEY);
                localStorage.removeItem(this.MOBILE_ACCESS_KEY);
                return null;
            }

            console.log("[📱 MOBILE] Loaded session from localStorage");
            return {
                session: parsed,
                hasAccess: accessData === 'true'
            };
        } catch (error) {
            console.error("[❌ MOBILE] Failed to load session:", error);
            return null;
        }
    }

    // UPDATED: User access checking (removed login tracking)
    async checkUserAccess(session) {
        console.log("[🔍 ACCESS] Checking user access for session:", session?.user?.id);

        if (!session?.user) {
            this.userHasAccess = false;
            return false;
        }

        try {
            const discordId = session.user.user_metadata.provider_id || session.user.user_metadata.sub;
            console.log("[🔍 ACCESS] Checking access for Discord ID:", discordId);

            // ✅ REMOVED: Don't track login here - this is just an access check, not a new login
            // await this.trackUserLogin(session, 'access_check');  // ❌ REMOVED

            const { data, error } = await this.client
                .from('users')
                .select('revoked, hub_trial, trial_expiration')
                .eq('discord_id', discordId)
                .single();

            if (error || !data) {
                console.error("[❌ ACCESS] Error or no data:", error?.message);
                this.userHasAccess = false;
                return false;
            }

            const now = new Date();
            const trialActive = data.hub_trial && new Date(data.trial_expiration) > now;
            const hasAccess = data.revoked === false || trialActive;

            console.log("[🔍 ACCESS] Access result:", { hasAccess, trialActive });

            this.userHasAccess = hasAccess;

            if (this.isMobileDevice()) {
                this.persistSessionToLocal(session, hasAccess);
            }

            return hasAccess;
        } catch (err) {
            console.error("[❌ ACCESS] Exception:", err);
            this.userHasAccess = false;
            return false;
        }
    }

    // UI Update methods with forced navbar visibility
    async updateNavbar(session, retryCount = 0) {
        const MAX_RETRIES = 5;

        if (this.navbarUpdateInProgress && retryCount === 0) {
            console.log("[⚠️ UI] Navbar update in progress, queuing retry");
            setTimeout(() => this.updateNavbar(session, 1), 200);
            return;
        }

        this.navbarUpdateInProgress = true;
        console.log("[🔄 UI] Updating navbar, attempt:", retryCount + 1);

        try {
            const nav = await this.waitForElement('.navbar', 5000);

            // Clear existing elements
            nav.querySelectorAll('.profile-info, .login-button').forEach(el => el.remove());

            if (!session?.user) {
                this.createLoginButton(nav);
                return;
            }

            // FORCE navbar to show user profile - this is the key fix
            await this.createUserProfile(nav, session);

            // Multiple verification attempts to ensure navbar is visible
            this.verifyNavbarVisibility(nav, session, retryCount);

        } catch (error) {
            console.error("[❌ UI] Navbar update failed:", error);

            // Retry logic for navbar loading
            if (retryCount < MAX_RETRIES) {
                console.log(`[🔄 UI] Retrying navbar update (${retryCount + 1}/${MAX_RETRIES})`);
                setTimeout(() => this.updateNavbar(session, retryCount + 1), 500);
                return;
            }
        } finally {
            this.navbarUpdateInProgress = false;
        }
    }

    // CRITICAL: Force navbar visibility verification
    verifyNavbarVisibility(nav, session, retryCount) {
        setTimeout(() => {
            const profileInfo = nav.querySelector('.profile-info');
            const profileName = nav.querySelector('#profileName');
            const profileImg = nav.querySelector('img');

            // Check if elements are actually visible
            const isVisible = profileInfo &&
                profileName &&
                profileImg &&
                profileInfo.offsetWidth > 0 &&
                profileInfo.offsetHeight > 0;

            if (!isVisible && retryCount < 3) {
                console.warn("[⚠️ UI] Navbar not visible, forcing recreation");
                this.navbarUpdateInProgress = false; // Reset flag
                this.updateNavbar(session, retryCount + 1);
            } else if (isVisible) {
                console.log("[✅ UI] Navbar visibility confirmed");
            } else {
                console.error("[❌ UI] Failed to make navbar visible after all retries");
            }
        }, 100);
    }

    createLoginButton(nav) {
        const loginBtn = document.createElement('button');
        loginBtn.classList.add('login-button');
        loginBtn.textContent = 'Login with Discord';
        loginBtn.setAttribute('aria-label', 'Login with Discord');
        loginBtn.onclick = async () => {
            console.log("[🚪 OAUTH] Starting Discord login...");
            await this.client.auth.signInWithOAuth({
                provider: 'discord',
                options: { redirectTo: window.location.href }
            });
        };
        nav.appendChild(loginBtn);
    }

    async createUserProfile(nav, session) {
        const user = session.user;
        const discordId = user.user_metadata.provider_id || user.user_metadata.sub;
        const username = user.user_metadata.full_name || 'Discord User';
        const avatarUrl = user.user_metadata.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';

        const userProfile = document.createElement('div');
        userProfile.classList.add('profile-info');

        // FORCE visibility with inline styles to prevent CSS issues
        userProfile.style.display = 'flex';
        userProfile.style.alignItems = 'center';
        userProfile.style.gap = '8px';
        userProfile.style.position = 'relative';
        userProfile.style.visibility = 'visible';
        userProfile.style.opacity = '1';

        userProfile.innerHTML = `
            <img src="${avatarUrl}" 
                 alt="User Avatar" 
                 style="width:32px;height:32px;border-radius:50%;display:block;visibility:visible;" 
                 aria-label="User profile picture">
            <span id="profileName" 
                  style="display:inline-block;visibility:visible;color:inherit;" 
                  aria-label="User profile">${username}</span>
            <div id="profileMenu" class="profile-menu">
                ${this.ADMIN_DISCORD_IDS.includes(discordId) ? '<a href="admin.html">Admin Suite</a>' : ''}
                <a href="profile.html">View Profile</a>
                <button class="logout-button">Logout</button>
            </div>
        `;

        nav.appendChild(userProfile);

        // Enhanced avatar loading with multiple fallbacks
        await this.setupAvatarLoading(userProfile, avatarUrl);

        // Setup profile menu interactions
        this.setupProfileMenu(userProfile);

        console.log("[✅ UI] User profile created for:", username);
    }

    async setupAvatarLoading(userProfile, avatarUrl) {
        const img = userProfile.querySelector('img');

        return new Promise((resolve) => {
            const loadAvatar = (url, fallbackUrl = 'https://cdn.discordapp.com/embed/avatars/0.png') => {
                const tempImg = new Image();
                tempImg.onload = () => {
                    img.src = tempImg.src;
                    img.style.visibility = 'visible';
                    img.style.opacity = '1';
                    console.log("[🖼️ UI] Avatar loaded successfully");
                    resolve();
                };
                tempImg.onerror = () => {
                    if (url !== fallbackUrl) {
                        console.log("[🖼️ UI] Avatar failed, trying fallback");
                        loadAvatar(fallbackUrl);
                    } else {
                        // Even fallback failed, show placeholder
                        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM3Mzc0NzMiLz4KPHBhdGggZD0iTTE2IDEwQzEzLjc5IDEwIDEyIDExLjc5IDEyIDE0QzEyIDE2LjIxIDEzLjc5IDE4IDE2IDE4QzE4LjIxIDE4IDIwIDE2LjIxIDIwIDE0QzIwIDExLjc5IDE4LjIxIDEwIDE2IDEwWk0xNiAyMkMxMi42NyAyMiAxMCAyMy4zNCAxMCAyNVYyNkgyMlYyNUMyMiAyMy4zNCAxOS4zMyAyMiAxNiAyMloiIGZpbGw9IiNGRkZGRkYiLz4KPC9zdmc+';
                        img.style.visibility = 'visible';
                        img.style.opacity = '1';
                        console.log("[🖼️ UI] Using placeholder avatar");
                        resolve();
                    }
                };
                tempImg.src = url;
            };

            loadAvatar(avatarUrl);

            // Timeout fallback
            setTimeout(() => {
                if (!img.complete || img.naturalHeight === 0) {
                    loadAvatar('https://cdn.discordapp.com/embed/avatars/0.png');
                }
            }, 2000);
        });
    }

    setupProfileMenu(userProfile) {
        const profileName = userProfile.querySelector('#profileName');
        const profileMenu = userProfile.querySelector('#profileMenu');
        const logoutBtn = userProfile.querySelector('.logout-button');

        const toggleMenu = (e) => {
            e.stopPropagation();
            e.preventDefault();
            profileMenu.classList.toggle('show');
        };

        // Event listeners for menu toggle
        profileName.addEventListener('click', toggleMenu);
        if (this.isMobileDevice()) {
            profileName.addEventListener('touchend', toggleMenu);
        }

        // Close menu when clicking outside
        const closeMenuHandler = (e) => {
            if (!userProfile.contains(e.target)) {
                profileMenu.classList.remove('show');
            }
        };

        document.addEventListener('click', closeMenuHandler);
        if (this.isMobileDevice()) {
            document.addEventListener('touchend', closeMenuHandler);
        }

        // Logout functionality
        if (logoutBtn) {
            const handleLogout = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                profileMenu.classList.remove('show');
                logoutBtn.disabled = true;
                logoutBtn.textContent = 'Logging out...';

                try {
                    await this.logout();
                } catch (error) {
                    console.error("[❌ LOGOUT] Error:", error);
                    logoutBtn.disabled = false;
                    logoutBtn.textContent = 'Logout';
                }
            };

            logoutBtn.addEventListener('click', handleLogout);
            if (this.isMobileDevice()) {
                logoutBtn.addEventListener('touchend', handleLogout);
            }
        }
    }

    updateButtonStates() {
        console.log("[🔄 BUTTONS] Updating button states. Access:", this.userHasAccess);

        const restrictedButtons = document.querySelectorAll('.cta-button[data-requires-access="true"]');

        restrictedButtons.forEach(button => {
            if (this.userHasAccess) {
                // Unlock button
                button.classList.remove('locked', 'loading');
                button.style.pointerEvents = 'auto';
                button.style.opacity = '1';
                button.style.background = 'linear-gradient(135deg, #00c6ff, #0072ff)';
                button.style.border = 'none';
                button.style.color = '#fff';

                const lockOverlay = button.querySelector('.lock-overlay');
                if (lockOverlay) lockOverlay.remove();
            } else {
                // Lock button
                button.classList.add('locked');
                button.classList.remove('loading');
                button.style.pointerEvents = 'none';
                button.style.opacity = '0.6';
                button.style.background = 'rgba(255, 255, 255, 0.05)';
                button.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                button.style.color = '#888';

                if (!button.querySelector('.lock-overlay')) {
                    const lockOverlay = document.createElement('span');
                    lockOverlay.className = 'lock-overlay';
                    lockOverlay.textContent = '🔒';
                    button.appendChild(lockOverlay);
                }
            }
        });
    }

    updateUnlockPlusButton() {
        const btn = document.getElementById('unlockPlusBtn');
        if (btn) {
            btn.style.display = this.userHasAccess ? 'none' : 'inline-block';
        }
    }

    // Enhanced logout with thorough cleanup
    async logout() {
        console.log("[🔁 LOGOUT] Starting logout process");

        try {
            const { error } = await this.client.auth.signOut();

            if (error) {
                console.error("[❌ LOGOUT] Supabase error:", error.message);
            } else {
                console.log("[✅ LOGOUT] Supabase signOut successful");
            }
        } catch (error) {
            console.error("[❌ LOGOUT] Exception:", error);
        }

        // Reset session state
        this.userHasAccess = false;
        this.currentSession = null;

        // Clear local/session storage
        try {
            localStorage.removeItem(this.MOBILE_SESSION_KEY);
            localStorage.removeItem(this.MOBILE_ACCESS_KEY);
            localStorage.clear();
            sessionStorage.clear();

            // Clear cookies
            document.cookie.split(";").forEach(c => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            console.log("[🧹 LOGOUT] Cleared local/session storage and cookies");
        } catch (error) {
            console.error("[❌ LOGOUT] Storage clear error:", error);
        }

        // Wait 100ms before reload to ensure storage clear
        setTimeout(() => {
            location.reload(true);
        }, 100);
    }

    // UPDATED: Auth state listener setup - Only track genuine login events
    setupAuthListener() {
        if (this.authStateListenerSet || !this.client) return;

        this.authStateListenerSet = true;

        this.client.auth.onAuthStateChange(async (event, session) => {
            console.log("[📶 AUTH] State changed:", event);

            this.currentSession = session;
            await this.checkUserAccess(session);

            // Force UI updates with delays for mobile
            const updateUI = async () => {
                await this.updateNavbar(session);
                this.updateButtonStates();
                this.updateUnlockPlusButton();
            };

            if (this.isMobileDevice()) {
                setTimeout(updateUI, 100);
            } else {
                updateUI();
            }

            // ✅ UPDATED: Only track logins on genuine Discord OAuth events
            if (session?.user) {
                if (event === "SIGNED_IN") {
                    // This is a real Discord OAuth login - track it
                    await this.trackUserLogin(session, 'auth_sign_in');
                }
                // ✅ REMOVED: Token refresh tracking - that's not a new login
                // ✅ REMOVED: Other automatic tracking - only track real logins
            }
        });
    }

    // Enhanced initialization
    async initializeApp() {
        if (window.__app_initialized__) return;
        window.__app_initialized__ = true;

        console.log("[🚀 INIT] Starting app initialization");

        try {
            this.setupAuthListener();

            // Get current session with multiple attempts
            let session = null;
            const { data: sessionData, error } = await this.client.auth.getSession();

            if (error) {
                console.error("[❌ INIT] Session fetch error:", error.message);
            } else {
                session = sessionData.session;
            }

            // Mobile-specific session recovery
            if (!session?.user && this.isMobileDevice()) {
                const localData = this.loadSessionFromLocal();
                if (localData) {
                    console.log("[📱 MOBILE] Using local session data");
                    session = localData.session;
                    this.userHasAccess = localData.hasAccess;
                }
            }

            // Session retry logic
            if (!session?.user) {
                for (let i = 0; i < 5; i++) {
                    await new Promise(r => setTimeout(r, 300));
                    const { data: retryData } = await this.client.auth.getSession();
                    if (retryData.session?.user) {
                        session = retryData.session;
                        break;
                    }
                }
            }

            this.currentSession = session;

            // Wait for navbar and update UI
            await this.waitForElement('.navbar');
            await this.checkUserAccess(session);

            // CRITICAL: Force navbar update with multiple attempts
            await this.updateNavbar(session);

            // Additional safety updates for mobile
            if (this.isMobileDevice()) {
                setTimeout(() => this.updateNavbar(session), 500);
                setTimeout(() => this.updateNavbar(session), 1000);
            }

            this.updateButtonStates();
            this.updateUnlockPlusButton();

            console.log("[✅ INIT] App initialized successfully");

        } catch (error) {
            console.error("[❌ INIT] Initialization failed:", error);
        }
    }

    // Utility methods
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const check = () => {
                const el = document.querySelector(selector);
                if (el) return resolve(el);

                setTimeout(() => {
                    const el = document.querySelector(selector);
                    if (el) return resolve(el);
                    reject(new Error(`Element ${selector} not found after ${timeout}ms`));
                }, timeout);
            };
            check();
        });
    }

    domReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    forceUnlockLoadingState() {
        const buttons = document.querySelectorAll('.cta-button');
        buttons.forEach(btn => btn.classList.remove('loading'));
    }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Enhanced app initialization with proper DOM ready handling
function initializeApp() {
    console.log("[🚀 APP] Starting application initialization");
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => authManager.initializeApp(), 100);
        });
    } else {
        setTimeout(() => authManager.initializeApp(), 100);
    }
}

// Start the app
initializeApp();

// Global exports for console testing and other scripts
window.authManager = authManager;