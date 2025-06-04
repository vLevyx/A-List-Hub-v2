let client;
let isInitialized = false;
let authStateListenerSet = false;

try {
    client = supabase.createClient(
        'https://dsexkdjxmhgqahrlkvax.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzZXhrZGp4bWhncWFocmxrdmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODAxNTAsImV4cCI6MjA2NDA1NjE1MH0.RW_ROpcNUNZaK9xGH2OFwHBSmFsGrLj-yi3LWCPBCvA'
    );
    console.log("[⚙️ INIT] Supabase client created:", client);
} catch (error) {
    console.error("[❌ INIT] Failed to create Supabase client:", error.message);
}

// Global state to track user access
let userHasAccess = false;
let currentSession = null;
let navbarUpdateInProgress = false;

// Mobile-specific session persistence
const MOBILE_SESSION_KEY = 'mobile_user_session';
const MOBILE_ACCESS_KEY = 'mobile_user_access';

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768;
}

function persistSessionToLocal(session, hasAccess) {
    if (!session?.user) return;

    try {
        const sessionData = {
            user: {
                id: session.user.id,
                user_metadata: session.user.user_metadata
            },
            timestamp: Date.now()
        };
        localStorage.setItem(MOBILE_SESSION_KEY, JSON.stringify(sessionData));
        localStorage.setItem(MOBILE_ACCESS_KEY, hasAccess.toString());
        console.log("[💾 MOBILE] Session persisted to localStorage");
    } catch (error) {
        console.error("[❌ MOBILE] Failed to persist session:", error);
    }
}

function loadSessionFromLocal() {
    try {
        const sessionData = localStorage.getItem(MOBILE_SESSION_KEY);
        const accessData = localStorage.getItem(MOBILE_ACCESS_KEY);

        if (!sessionData) return null;

        const parsed = JSON.parse(sessionData);
        const timestamp = parsed.timestamp || 0;
        const isStale = Date.now() - timestamp > 24 * 60 * 60 * 1000; // 24 hours

        if (isStale) {
            localStorage.removeItem(MOBILE_SESSION_KEY);
            localStorage.removeItem(MOBILE_ACCESS_KEY);
            return null;
        }

        console.log("[📱 MOBILE] Loaded session from localStorage");
        return {
            session: parsed,
            hasAccess: accessData === 'true'
        };
    } catch (error) {
        console.error("[❌ MOBILE] Failed to load session from localStorage:", error);
        return null;
    }
}

async function checkUserAccess(session) {
    console.log("[🔍 ACCESS] Checking user access for session:", session?.user?.id);

    if (!session?.user) {
        console.log("[🔍 ACCESS] No session, user has no access");
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
            console.log("[🔍 ACCESS] No user data found, user has no access");
            userHasAccess = false;
            return false;
        }

        // Check if user has access (not revoked OR has active trial)
        const now = new Date();
        const trialActive = data.hub_trial && new Date(data.trial_expiration) > now;
        const hasAccess = data.revoked === false || trialActive;

        console.log("[🔍 ACCESS] User access check result:", {
            revoked: data.revoked,
            hubTrial: data.hub_trial,
            trialExpiration: data.trial_expiration,
            trialActive: trialActive,
            hasAccess: hasAccess
        });

        userHasAccess = hasAccess;

        // Persist for mobile
        if (isMobileDevice()) {
            persistSessionToLocal(session, hasAccess);
        }

        return hasAccess;

    } catch (err) {
        console.error("[❌ ACCESS] Exception checking user access:", err);
        userHasAccess = false;
        return false;
    }
}

function updateButtonStates() {
    console.log("[🔄 BUTTONS] Updating button states. User has access:", userHasAccess);

    // Get all buttons that require access
    const restrictedButtons = document.querySelectorAll('.cta-button[data-requires-access="true"]');

    restrictedButtons.forEach(button => {
        if (userHasAccess) {
            // Unlock the button
            button.classList.remove('locked', 'loading');
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';

            // Restore original background
            button.style.background = 'linear-gradient(135deg, #00c6ff, #0072ff)';
            button.style.border = 'none';
            button.style.color = '#fff';

            // Remove lock overlay
            const lockOverlay = button.querySelector('.lock-overlay');
            if (lockOverlay) {
                lockOverlay.remove();
            }

            console.log("[✅ BUTTONS] Unlocked button:", button.href || button.textContent);
        } else {
            // Lock the button
            button.classList.add('locked');
            button.classList.remove('loading');
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.6';
            button.style.background = 'rgba(255, 255, 255, 0.05)';
            button.style.border = '1px solid rgba(255, 255, 255, 0.08)';
            button.style.color = '#888';

            // Add lock overlay if not present
            if (!button.querySelector('.lock-overlay')) {
                const lockOverlay = document.createElement('span');
                lockOverlay.className = 'lock-overlay';
                lockOverlay.textContent = '🔒';
                button.appendChild(lockOverlay);
            }

            console.log("[🔒 BUTTONS] Locked button:", button.href || button.textContent);
        }
    });
}

function updateNavbar(session) {
    if (navbarUpdateInProgress) {
        console.log("[⚠️ UI] Navbar update already in progress, skipping");
        return;
    }

    navbarUpdateInProgress = true;

    console.log("[🔄 UI] Updating navbar. Session:", session?.user?.id);
    const nav = document.querySelector('.navbar');
    if (!nav) {
        console.error("[❌ UI] Navbar not found.");
        navbarUpdateInProgress = false;
        return;
    }

    // Clear any existing login/profile elements
    const existingElements = nav.querySelectorAll('.profile-info, .login-button');
    existingElements.forEach(el => el.remove());

    if (!session?.user) {
        console.log("[🔓 UI] No user session. Showing login button.");

        const loginBtn = document.createElement('button');
        loginBtn.classList.add('login-button');
        loginBtn.textContent = 'Login with Discord';
        loginBtn.setAttribute('aria-label', 'Login with Discord');
        loginBtn.onclick = async () => {
            console.log("[🚪 OAUTH] Starting Discord login flow...");
            await client.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: window.location.href
                }
            });
        };

        nav.appendChild(loginBtn);
        navbarUpdateInProgress = false;
        return;
    }

    const adminDiscordIds = [
        "154388953053659137",
        "344637470908088322",
        "796587763851198474",
        "492053410967846933",
        "487476487386038292"
    ];

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
      ${adminDiscordIds.includes(discordId) ? '<a href="admin.html">Admin Suite</a>' : ''}
      <a href="profile.html">View Profile</a>
      <button class="logout-button">Logout</button>
    </div>
  `;

    // Enhanced avatar loading with mobile-specific handling
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

    // Immediate load attempt
    loadAvatar();

    // Mobile-specific retry mechanism
    if (isMobileDevice()) {
        setTimeout(() => {
            if (!img.complete || img.naturalHeight === 0) {
                console.log("[📱 MOBILE] Retrying avatar load for mobile");
                loadAvatar();
            }
        }, 1000);
    }

    nav.appendChild(userProfile);

    // Add profile menu functionality with mobile-optimized event handling
    const profileName = userProfile.querySelector('#profileName');
    const profileMenu = userProfile.querySelector('#profileMenu');

    const toggleMenu = (e) => {
        e.stopPropagation();
        e.preventDefault();
        profileMenu.classList.toggle('show');
        console.log("[📱 UI] Profile menu toggled:", profileMenu.classList.contains('show'));
    };

    // Use both click and touchend for better mobile support
    profileName.addEventListener('click', toggleMenu);
    if (isMobileDevice()) {
        profileName.addEventListener('touchend', toggleMenu);
    }

    // Enhanced click-outside handling for mobile
    const closeMenuHandler = (e) => {
        if (!userProfile.contains(e.target)) {
            profileMenu.classList.remove('show');
        }
    };

    document.addEventListener('click', closeMenuHandler);
    if (isMobileDevice()) {
        document.addEventListener('touchend', closeMenuHandler);
    }

    // Fixed logout button event handling
    const logoutBtn = userProfile.querySelector('.logout-button');
    if (logoutBtn) {
        const handleLogout = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("[🔁 LOGOUT] Logout button clicked");

            // Close the menu first
            profileMenu.classList.remove('show');

            // Disable the button to prevent multiple clicks
            logoutBtn.disabled = true;
            logoutBtn.textContent = 'Logging out...';

            try {
                await logout();
            } catch (error) {
                console.error("[❌ LOGOUT] Error during logout:", error);
                // Re-enable button if logout failed
                logoutBtn.disabled = false;
                logoutBtn.textContent = 'Logout';
            }
        };

        // Remove any existing event listeners by cloning the button
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);

        // Add fresh event listeners
        newLogoutBtn.addEventListener('click', handleLogout);
        if (isMobileDevice()) {
            newLogoutBtn.addEventListener('touchend', handleLogout);
        }
    }

    console.log("[✅ UI] Navbar updated with user profile:", username);
    navbarUpdateInProgress = false;
}

async function updateUnlockPlusButton() {
    console.log("[🔄 UNLOCK] Updating unlock plus button. User has access:", userHasAccess);
    const btn = document.getElementById('unlockPlusBtn');
    if (!btn) return;

    if (userHasAccess) {
        btn.style.display = 'none';
    } else {
        btn.style.display = 'inline-block';
    }
}

async function logout() {
    console.log("[🔁 LOGOUT] Logout function called");

    try {
        // First, sign out from Supabase
        console.log("[🔁 LOGOUT] Signing out from Supabase...");
        const { error } = await client.auth.signOut();
        if (error) {
            console.error("[❌ LOGOUT] Supabase signout error:", error.message);
            // Continue with cleanup even if Supabase signout fails
        } else {
            console.log("[✅ LOGOUT] Supabase signout successful");
        }
    } catch (error) {
        console.error("[❌ LOGOUT] Exception during Supabase signout:", error);
    }

    // Clear all local state and storage
    console.log("[🔁 LOGOUT] Clearing local state...");
    userHasAccess = false;
    currentSession = null;

    // Clear mobile-specific storage
    try {
        localStorage.removeItem(MOBILE_SESSION_KEY);
        localStorage.removeItem(MOBILE_ACCESS_KEY);
        console.log("[✅ LOGOUT] Mobile storage cleared");
    } catch (error) {
        console.error("[❌ LOGOUT] Error clearing mobile storage:", error);
    }

    // Clear all localStorage and sessionStorage
    try {
        localStorage.clear();
        sessionStorage.clear();
        console.log("[✅ LOGOUT] All storage cleared");
    } catch (error) {
        console.error("[❌ LOGOUT] Error clearing storage:", error);
    }

    // Clear cookies
    try {
        document.cookie.split(";").forEach(function (c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        console.log("[✅ LOGOUT] Cookies cleared");
    } catch (error) {
        console.error("[❌ LOGOUT] Error clearing cookies:", error);
    }

    // Force reload the page to ensure clean state
    console.log("[🔁 LOGOUT] Reloading page...");
    window.location.reload();
}

// Enhanced auth state change listener with mobile-specific handling
function setupAuthListener() {
    if (authStateListenerSet || !client) return;

    authStateListenerSet = true;
    console.log("[📶 AUTH] Setting up auth state listener");

    client.auth.onAuthStateChange(async (event, session) => {
        console.log("[📶 AUTH] State changed:", event, "Session:", session?.user?.id);

        currentSession = session;

        // Always check user access when auth state changes
        await checkUserAccess(session);

        // Update UI with mobile-specific delays
        if (isMobileDevice()) {
            // Add small delays for mobile to ensure DOM is ready
            setTimeout(() => updateNavbar(session), 100);
            setTimeout(() => updateButtonStates(), 150);
            setTimeout(() => updateUnlockPlusButton(), 200);
        } else {
            updateNavbar(session);
            updateButtonStates();
            updateUnlockPlusButton();
        }

        if (event === "SIGNED_IN" && session?.user) {
            const discordId = session.user.user_metadata.provider_id || session.user.user_metadata.sub;
            const username = session.user.user_metadata.full_name || 'Discord User';

            try {
                const { data, error } = await client.rpc('upsert_user_login', {
                    target_discord_id: discordId,
                    user_name: username
                });
                if (error) throw error;
                console.log("[✅ RPC] upsert_user_login result:", data);
            } catch (err) {
                console.error("[❌ RPC] Upsert error:", err.message);
            }
        }
    });
}

// Enhanced initialization with mobile-specific session recovery
async function initializeApp() {
    if (window.__app_initialized__) {
        console.log("[⚠️ INIT] Skipping duplicate initializeApp call.");
        return;
    }
    window.__app_initialized__ = true;

    console.log("[⚙️ INIT] Starting app initialization...");

    try {
        setupAuthListener();

        // Try to get current session from Supabase
        const { data: { session }, error } = await client.auth.getSession();
        if (error) console.error("[❌ INIT] Error fetching session:", error.message);

        currentSession = session;

        // Mobile-specific: If no session from Supabase, try to load from localStorage
        if (!session?.user && isMobileDevice()) {
            console.log("[📱 MOBILE] No Supabase session, checking localStorage...");
            const localData = loadSessionFromLocal();
            if (localData) {
                console.log("[📱 MOBILE] Found local session data, using it for UI");
                currentSession = localData.session;
                userHasAccess = localData.hasAccess;

                // Update UI immediately with local data
                await waitForElement(".navbar");
                updateNavbar(currentSession);
                updateButtonStates();
                updateUnlockPlusButton();

                // Try to refresh the actual session in background
                setTimeout(async () => {
                    console.log("[📱 MOBILE] Attempting to refresh Supabase session...");
                    const { data: { session: refreshedSession } } = await client.auth.getSession();
                    if (refreshedSession?.user) {
                        console.log("[📱 MOBILE] Session refreshed successfully");
                        currentSession = refreshedSession;
                        await checkUserAccess(refreshedSession);
                        updateNavbar(refreshedSession);
                        updateButtonStates();
                        updateUnlockPlusButton();
                    }
                }, 1000);

                return; // Exit early since we've handled mobile case
            }
        }

        // Standard session retry logic for cases where session might be loading
        if (!session?.user) {
            for (let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 300));
                const { data: { session: retrySession } } = await client.auth.getSession();
                if (retrySession?.user) {
                    currentSession = retrySession;
                    break;
                }
            }
        }

        await waitForElement(".navbar");
        await checkUserAccess(currentSession);

        // Update UI with progressive enhancement for mobile
        updateNavbar(currentSession);

        if (isMobileDevice()) {
            // Multiple update attempts for mobile reliability
            requestAnimationFrame(() => {
                updateNavbar(currentSession);
                setTimeout(() => updateNavbar(currentSession), 500);
            });
        }

        updateButtonStates();
        updateUnlockPlusButton();

        console.log("[✅ INIT] App initialized. User access:", userHasAccess);
    } catch (error) {
        console.error("[❌ INIT] Failed to initialize app:", error.message);
    }
}

function waitForElement(selector, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const interval = 100;
        let elapsed = 0;

        const check = () => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            elapsed += interval;
            if (elapsed >= timeout) return reject(new Error(`Element ${selector} not found after ${timeout}ms`));
            setTimeout(check, interval);
        };

        check();
    });
}

function domReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

function safelyInitializeApp() {
    console.log('[🚀 SAFE INIT] Attempting to initialize app with full DOM readiness');
    domReady(() => {
        initializeApp();
    });
}

// Enhanced event listeners with mobile-specific handling
window.addEventListener('load', safelyInitializeApp);
window.addEventListener('DOMContentLoaded', safelyInitializeApp);

// Mobile-specific page lifecycle handling
window.addEventListener('pageshow', (event) => {
    console.log("[📱 PAGESHOW] Page shown, persisted:", event.persisted);

    if (event.persisted || isMobileDevice()) {
        console.log("[📱 MOBILE] Page restored or mobile device, re-initializing...");

        // For mobile or cached pages, try to restore from localStorage first
        if (isMobileDevice()) {
            const localData = loadSessionFromLocal();
            if (localData) {
                currentSession = localData.session;
                userHasAccess = localData.hasAccess;

                // Force UI update
                setTimeout(() => {
                    updateNavbar(currentSession);
                    updateButtonStates();
                    updateUnlockPlusButton();
                }, 100);
            }
        }

        // Then run full initialization
        safelyInitializeApp();
    }
});

// Mobile-specific visibility change handling
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isMobileDevice()) {
        console.log("[📱 MOBILE] Page became visible, checking session...");
        setTimeout(() => {
            if (currentSession?.user) {
                updateNavbar(currentSession);
            }
        }, 200);
    }
});

// Mobile-specific orientation change handling
window.addEventListener('orientationchange', () => {
    if (isMobileDevice()) {
        console.log("[📱 MOBILE] Orientation changed, re-updating navbar...");
        setTimeout(() => {
            if (currentSession?.user) {
                updateNavbar(currentSession);
            }
        }, 300);
    }
});

// Force unlock loading state
function forceUnlockLoadingState() {
    const buttons = document.querySelectorAll('.cta-button');
    buttons.forEach(btn => btn.classList.remove('loading'));
}

(async () => {
    await new Promise(r => setTimeout(r, 250));
    forceUnlockLoadingState();
})();

// Enhanced Safari-specific handling
window.addEventListener("pageshow", function (event) {
    const restored = event.persisted || (window.performance && window.performance.navigation.type === 2);
    const sessionExists = window.__app_initialized__;
    const jsVersionElement = document.getElementById("js-version");
    const reloaded = jsVersionElement && window.sessionStorage.getItem("lastJsVersion") === jsVersionElement.textContent;

    if (restored && !sessionExists && !reloaded && !isMobileDevice()) {
        console.warn("[♻️ SAFARI] Forcing reload due to partial cache restore...");
        if (jsVersionElement) {
            window.sessionStorage.setItem("lastJsVersion", jsVersionElement.textContent);
        }
        location.reload();
    }
});
