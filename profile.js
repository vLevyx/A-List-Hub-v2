import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.6';

const client = createClient(
  'https://dsexkdjxmhgqahrlkvax.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzZXhrZGp4bWhncWFocmxrdmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODAxNTAsImV4cCI6MjA2NDA1NjE1MH0.RW_ROpcNUNZaK9xGH2OFwHBSmFsGrLj-yi3LWCPBCvA'
);

// Constants - defined early for reuse
const defaultOnCategories = ['Components', 'HQ Components'];

const itemsByCategory = {
  'Weapons': ['AK-74', 'AKS-74U', 'CheyTac M200 Intervention', 'Colt 1911', 'Desert Eagle', 'M16A2', 'M16A2 - AUTO', 'M16 Carbine', 'M21 SWS', 'M249 SAW', 'M416', 'M9', 'MP 43 1C', 'MP5A2', 'MP7A2', 'PKM', 'PM', 'RPK-74',
    'Sa-58P', 'Sa-58V', 'Scar-H', 'SIG MCX', 'SIG MCX SPEAR', 'SSG10A2-Sniper', 'Steyr AUG', 'SR-25 Rifle', 'SVD'],

  'Magazines': ['30rnd 9x19 Mag', '8rnd .45 ACP', '9x18mm 8rnd PM Mag', '9x19mm 15rnd M9 Mag', '.300 Blackout Mag', '.338 5rnd FMJ', '.50 AE 7rnd Mag',
    '12/70 7mm Buckshot', '4.6x40 40rnd Mag', '5.45x39mm 30rnd AK Mag', '5.45x39mm 45rnd RPK-74 Tracer Mag', '5.56x45mm 30rnd AUG Mag',
    '5.56x45mm 30rnd STANAG Mag', '5.56x45mm 200rnd M249 Belt', '7Rnd M200 Magazine', '7.62x39mm 30rnd Sa-58 Mag', '7.62x51mm FMJ', '7.62x51mm 20rnd M14 Mag',
    '7.62x51mm 30rnd Mag', 'SR25 7.62x51mm 20rnd', '7.62x54mmR 100rnd PK Belt', 'SPEAR 6.8x51 25rnd'],

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
    'Kevlar', 'Mechanical Component (HQ)', 'Rotor (HQ)', 'Stabilizer (HQ)', 'Weapon Part (HQ)'],

  'Components': ['Cloth', 'Iron Plate', 'Component', 'Tempered Glass', 'Weapon Part', 'Stabilizer', 'Attachment Part',
    'Ammo', 'Mechanical Component', 'Engine Part', 'Interior Part', 'Rotor']
};

// Utility functions
function getDiscordId(user) {
  const metadata = user.user_metadata || {};
  return metadata.provider_id || metadata.sub || user.id;
}

function getUsername(user) {
  const metadata = user.user_metadata || {};
  return metadata.full_name || metadata.name || 'Unknown';
}

function getAvatarUrl(user) {
  const metadata = user.user_metadata || {};
  return metadata.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';
}

// Core authentication function
async function getAuthenticatedUser() {
  console.log('[🛂 STEP] getAuthenticatedUser() started');
  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    console.log('[📶 SESSION]', session);

    if (sessionError || !session || !session.user) {
      console.warn('[❌ SESSION ERROR]', sessionError);
      console.error("Authentication failure:", { sessionError, session });
      window.location.href = '/';
      return null;
    }

    return session.user;
  } catch (error) {
    console.error("Auth error:", error);
    window.location.href = '/';
    return null;
  }
}

// Profile management functions
async function loadUserProfile(user) {
  const discordId = getDiscordId(user);
  const username = getUsername(user);
  const avatarUrl = getAvatarUrl(user);

  // Update UI elements safely
  const avatarEl = document.getElementById('avatar');
  const usernameEl = document.getElementById('username');
  const discordIdEl = document.getElementById('discordId');

  if (avatarEl) avatarEl.src = avatarUrl;
  if (usernameEl) usernameEl.textContent = username;
  if (discordIdEl) discordIdEl.textContent = discordId;

  try {
    const { data, error } = await client
      .from('users')
      .select('created_at, last_login, revoked, login_count')
      .eq('discord_id', discordId)
      .single();

    if (!error && data) {
      updateUserInfo(data);
    }
  } catch (error) {
    console.error("Failed to load user profile:", error);
  }

  return discordId;
}

function updateUserInfo(data) {
  const createdAtEl = document.getElementById('createdAt');
  const lastLoginEl = document.getElementById('lastLogin');
  const statusEl = document.getElementById('status');
  const loginCountEl = document.getElementById('loginCount');

  if (createdAtEl) {
    createdAtEl.textContent = new Date(data.created_at).toLocaleDateString();
  }

  if (lastLoginEl) {
    lastLoginEl.textContent = data.last_login
      ? new Date(data.last_login).toLocaleDateString()
      : '—';
  }

  if (statusEl) {
    if (data.revoked) {
      statusEl.textContent = 'Access Revoked';
      statusEl.className = 'status-badge status-revoked';
    } else {
      statusEl.textContent = 'Whitelisted';
      statusEl.className = 'status-badge status-active';
    }
  }

  if (loginCountEl) {
    loginCountEl.textContent = data.login_count ?? 0;
  }
}

// Blueprint management functions
async function loadBlueprints(discordId) {
  try {
    const { data, error } = await client
      .from('user_blueprints')
      .select('blueprint_name')
      .eq('discord_id', discordId);

    if (error) {
      console.error("Failed to load blueprints:", error);
      return;
    }

    const owned = data?.map(d => d.blueprint_name) || [];
    renderBlueprints(owned);
  } catch (error) {
    console.error("Blueprint loading error:", error);
  }
}

function renderBlueprints(ownedBlueprints) {
  const container = document.getElementById('blueprintList');
  if (!container) return;

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  Object.entries(itemsByCategory).forEach(([category, items]) => {
    const group = createCategoryGroup(category, items, ownedBlueprints);
    fragment.appendChild(group);
  });

  container.innerHTML = '';
  container.appendChild(fragment);

  // Attach event listeners after DOM update
  attachBlueprintEventListeners();
  updateBlueprintCount();
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
    const itemDiv = createBlueprintItem(item, category, ownedBlueprints);
    content.appendChild(itemDiv);
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
  input.checked = ownedBlueprints.includes(item) || defaultOnCategories.includes(category);

  const slider = document.createElement('span');
  slider.className = 'toggle-slider';

  switchWrapper.appendChild(input);
  switchWrapper.appendChild(slider);

  itemDiv.appendChild(label);
  itemDiv.appendChild(switchWrapper);

  return itemDiv;
}

function attachBlueprintEventListeners() {
  const checkboxes = document.querySelectorAll('#blueprintList input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateBlueprintCount);
  });
}

function updateBlueprintCount() {
  const checkboxes = document.querySelectorAll('#blueprintList input[type="checkbox"]');
  const filtered = Array.from(checkboxes).filter(cb => {
    const category = cb.closest('details')?.querySelector('summary')?.textContent || '';
    return !['Components', 'HQ Components'].some(c => category.includes(c));
  });

  const selected = filtered.filter(cb => cb.checked);
  const countEl = document.getElementById('blueprintCount');

  if (countEl) {
    countEl.textContent = `📃 Selected: ${selected.length} / ${filtered.length} Blueprints`;
  }
}

async function saveBlueprints() {
  try {
    const checkboxes = document.querySelectorAll('#blueprintList input[type="checkbox"]');
    const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

    const user = await getAuthenticatedUser();
    if (!user) return;

    const discordId = getDiscordId(user);

    // Delete existing blueprints
    await client.from('user_blueprints').delete().eq('discord_id', discordId);

    // Insert new blueprints if any selected
    if (selected.length > 0) {
      const inserts = selected.map(name => ({ discord_id: discordId, blueprint_name: name }));
      const { error } = await client.from('user_blueprints').insert(inserts);

      if (error) {
        throw error;
      }
    }

    alert('Blueprints saved successfully!');
  } catch (error) {
    console.error("Save blueprints error:", error);
    alert('Failed to save blueprints. Please try again.');
  }
}

// Authentication and logout functions
function logout() {
  client.auth.signOut()
    .then(() => {
      window.location.href = "/";
    })
    .catch(error => {
      console.error("Logout failed:", error);
      alert("Failed to log out. Please try again.");
    });
}

// Main initialization function
async function loadProfile() {
  console.log('[🚀 loadProfile()] Called');
  const user = await getAuthenticatedUser();
  if (!user) return;

  const discordId = await loadUserProfile(user); // 👈 Call it here
  await loadBlueprints(discordId);               // 👈 Now load blueprints using ID
}

// Navigation handling for SPA behavior
async function handleNavigation() {
  console.log("[🔁 NAVIGATION] Back/forward navigation detected. Reloading session and UI...");

  try {
    const { data: { session } } = await client.auth.getSession();
    if (session && typeof updateNavbar === 'function') {
      updateNavbar(session);
    }
  } catch (error) {
    console.error("Navigation handling error:", error);
  }
}

// Utility function for session waiting (kept for backward compatibility)
async function waitForSessionAndLoad(callback) {
  let tries = 0;
  let session = null;

  while (tries < 3 && !session) {
    try {
      const { data, error } = await client.auth.getSession();
      session = data?.session;

      if (session) {
        callback(session);
        return;
      }
    } catch (error) {
      console.error(`Session attempt ${tries + 1} failed:`, error);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    tries++;
  }

  // Redirect if no session found
  window.location.href = "/";
}

// Event listeners - Set up after DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[🚀 INIT] DOM loaded, checking existing session...');

  let tries = 0;
  let session = null;

  while (tries < 5 && !session) {
    const result = await client.auth.getSession();
    session = result.data?.session;

    if (session) break;

    await new Promise(res => setTimeout(res, 400));
    tries++;
  }

  if (session?.user) {
    console.log('[✅ SESSION FOUND] Calling loadProfile()');
    await loadProfile();
  } else {
    console.warn('[❌ NO SESSION FOUND] Redirecting...');
    window.location.href = "/";
  }
});

window.addEventListener('pageshow', async (event) => {
  if (event.persisted || performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
    await handleNavigation();
  }
});

// Global function exposure for potential external use
window.saveBlueprints = saveBlueprints;
window.logout = logout;