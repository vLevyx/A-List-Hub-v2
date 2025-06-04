// Vehicle data - loaded first as it's required by all functions
const vehicles = [
  {
    "name": "M1025 Light Armored Vehicle",
    "price": 250000,
    "ores": 18,
    "photo": "m1025.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Vehicle Shop (Outpost)",
    "usage": "Quick transport with armor protection"
  },
  {
    "name": "M151A2 Off-Road",
    "price": 25000,
    "ores": 16,
    "photo": "m151a2_cover.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Inexpensive scouting and patrols"
  },
  {
    "name": "M151A2 Off-Road - Open Top",
    "price": 25000,
    "ores": 16,
    "photo": "m151a2offroad-opentop.png",
    "colors": "Olive, Camo, Black, Blue, Brown, Green, Khaki, Orange, Pink, Red, White, Yellow",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Recon missions and off-road traversal"
  },
  {
    "name": "M998 Light Utility Vehicle",
    "price": 150000,
    "ores": 18,
    "photo": "m998LUV.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Vehicle Shop (Outpost)",
    "usage": "Tactical mobility and personel transport"
  },
  {
    "name": "M998 Light Utility Vehicle - Canopy",
    "price": 175000,
    "ores": 18,
    "photo": "m998LUVcanopy.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Vehicle Shop (Outpost)",
    "usage": "Tactical mobility and personel transport"
  },
  {
    "name": "M923A1 Fuel Truck",
    "price": 1000000,
    "Canisters": 53,
    "photo": "m923a1_fuel.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "American Fuel Truck. Used for Fuel and Polyester refining. NOTE: American trucks CANNOT be lock picked."
  },
  {
    "name": "M923A1 Transport Truck",
    "price": 800000,
    "ores": 50,
    "photo": "m923a1.png",
    "colors": "Olive, Camo, Black, Blue, Brown, Green, Khaki, Orange, Red, White, Yellow",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Bulk personel or item transport. NOTE: American trucks CANNOT be lock picked."
  },
  {
    "name": "M923A1 Transport Truck - Canopy",
    "price": 1800000,
    "ores": 83,
    "photo": "m923a1_cover.png",
    "colors": "Olive, Camo, Black, Blue, Brown, Green, Khaki, Orange, Red, White, Yellow",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Bulk personel or item transport, comes with a canopy for better concealment. NOTE: American trucks CANNOT be lock picked."
  },
  {
    "name": "Pickup Truck",
    "price": 500000,
    "ores": 18,
    "photo": "pickuptruck.png",
    "colors": "Red, Black, Yellow, Gray, Green, Purple, White, Turquoise",
    "whereToBuy": "Luca's Vehicle Import (Levie)",
    "usage": "All-purpose civilian transport"
  },
  {
    "name": "UAZ-452 Off-Road",
    "price": 95000,
    "ores": 28,
    "photo": "uaz452offroad.png",
    "colors": "Olive, Red, Green, Purple",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Rugged off-road delivery or utility"
  },
  {
    "name": "UAZ-452 Off-Road - Laboratory",
    "price": 2000000,
    "ores": 57,
    "Canisters": 110,
    "photo": "uaz452-laboratory.png",
    "colors": "Grey",
    "whereToBuy": "Black Market",
    "usage": "Rugged off-road meth-laboratory."
  },
  {
    "name": "UAZ-452 Off-Road - Banana",
    "price": 450000,
    "ores": 28,
    "photo": "uaz452banana.png",
    "colors": "Banana",
    "whereToBuy": "Banana's Chillout Zone",
    "usage": "Drive around in a banana van. Why WOULDN'T you want to do that?"
  },
  {
    "name": "UAZ-469 Off-Road",
    "price": 10000,
    "ores": 13,
    "photo": "uaz469_cover.png",
    "colors": "Olive, Camo, Black, Brown, Green, Orange, Red, White, Teal",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Light scout and general use"
  },
  {
    "name": "UAZ-469 Off-Road - Open Top",
    "price": 10000,
    "ores": 13,
    "photo": "uaz469offroad-opentop.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Open recon with basic mobility"
  },
  {
    "name": "Ural-4320 Fuel Truck",
    "price": 2800000,
    "Canisters": 83,
    "photo": "ural4320_fuel.png",
    "colors": "Olive, Camo, Blue, Orange, White-Blue, White-Red",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Large-scale Fuel Truck. Used for Fuel and Polyester refining. NOTE: Russian trucks CAN be lock picked."
  },
  {
    "name": "Ural-4320 Transport Truck",
    "price": 2800000,
    "ores": 100,
    "photo": "ural4320transporttruck.png",
    "colors": "Olive, Camo, Blue, Orange, White-Blue",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Large-scale / Bulk personel or item transport. NOTE: Russian trucks CAN be lock picked."
  },
  {
    "name": "Ural-4320 Transport Truck - Canopy",
    "price": 4000000,
    "ores": 116,
    "photo": "ural4320_cover.png",
    "colors": "Olive, Camo, Blue, Orange, White-Blue",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Large-scale / Bulk personel or item transport, comes with a canopy for better concealment. NOTE: Russian trucks CAN be lock picked."
  },
  {
    "name": "VW Rolf",
    "price": 800000,
    "ores": 18,
    "photo": "vwrolf.png",
    "colors": "Black, White",
    "whereToBuy": "VW Car Dealer",
    "usage": "Stylish personal vehicle, quick car to get from point A to point B."
  },
  {
    "name": "S105 Car",
    "price": 85000,
    "ores": 18,
    "photo": "s105car.png",
    "colors": "Light Blue, Tan, Dark Blue, Brown, Dark Red, Green, Olive, Red, White, Yellow",
    "whereToBuy": "Import Vehicles (Meaux, Regina)",
    "usage": "Budget personal vehicle"
  },
  {
    "name": "S1203 Minibus",
    "price": 185000,
    "ores": 18,
    "photo": "S1203-Minibus.png",
    "colors": "Red, Blue, Brown, Yellow, Khaki",
    "whereToBuy": "Import Vehicles (Meaux, Regina)",
    "usage": "Small group and item transport"
  },
  {
    "name": "MI8-MT Transport Helicopter",
    "price": 68000000,
    "ores": 26,
    "photo": "mi8-mt.png",
    "colors": "Camo",
    "whereToBuy": "Only obtainable through crafting",
    "usage": "Russian High-capacity air transport. Holds: 3 Pilots - 13 Passengers"
  },
  {
    "name": "UH-1H Transport Helicopter",
    "price": 60000000,
    "ores": 26,
    "photo": "uh-1h.png",
    "colors": "Green",
    "whereToBuy": "Only obtainable through crafting",
    "usage": "United States Tactical helicopter mobility. Holds: 2 Pilots - 10 Passengers"
  }
];

// Configuration constants
const discountRates = {
  neutral: 0,
  positive1: -5.5,
  positive2: -10.5,
  positive3: -19.10,
  negative1: 25.0,
  negative2: 28.0,
  negative3: 53.0
};

// Cache DOM elements to avoid repeated queries
let cachedElements = null;

function getCachedElements() {
  if (!cachedElements) {
    cachedElements = {
      container: document.getElementById('vehicle-container'),
      reputation: document.getElementById('reputation'),
      vehicleSearch: document.getElementById('vehicleSearch'),
      modal: document.getElementById('vehicleModal'),
      modalTitle: document.getElementById('modalTitle'),
      modalImage: document.getElementById('modalImage'),
      modalPrice: document.getElementById('modalPrice'),
      modalOres: document.getElementById('modalOres'),
      modalHoneycombs: document.getElementById('modalHoneycombs'),
      modalCanisters: document.getElementById('modalCanisters'),
      modalColors: document.getElementById('modalColors'),
      modalBuy: document.getElementById('modalBuy'),
      modalUse: document.getElementById('modalUse')
    };
  }
  return cachedElements;
}

// Utility functions
function formatPrice(price) {
  return `$${Math.round(price).toLocaleString()}`;
}

function calculateAdjustedPrice(basePrice, reputationLevel) {
  const discount = discountRates[reputationLevel] || 0;
  return basePrice * (1 + (discount / 100));
}

function getResourceDisplay(vehicle) {
  if (vehicle.Canisters) return `Canisters: ${vehicle.Canisters}`;
  if (vehicle.honeycombs) return `Honeycombs: ${vehicle.honeycombs}`;
  return `Ores: ${vehicle.ores}`;
}

// Optimized vehicle card creation with DocumentFragment for better performance
function createVehicleCard(vehicle, adjustedPrice) {
  const vehicleCard = document.createElement('div');
  vehicleCard.className = 'vehicle-card';
  vehicleCard.innerHTML = `
    <img src="${vehicle.photo}" alt="${vehicle.name}" loading="lazy">
    <div class="vehicle-info">
      <h3>${vehicle.name}</h3>
      <p>${formatPrice(adjustedPrice)}</p>
      <p>${getResourceDisplay(vehicle)}</p>
    </div>
  `;

  // Use event delegation pattern for better performance
  vehicleCard.addEventListener('click', () => openModal(vehicle, adjustedPrice), { passive: true });

  return vehicleCard;
}

// Main rendering function with performance optimizations
function renderVehicles(reputationLevel = 'neutral') {
  const elements = getCachedElements();
  const container = elements.container;

  if (!container) {
    console.error('Vehicle container not found');
    return;
  }

  // Use DocumentFragment for efficient DOM manipulation
  const fragment = document.createDocumentFragment();

  // Clear container efficiently
  container.innerHTML = '';

  vehicles.forEach(vehicle => {
    const adjustedPrice = calculateAdjustedPrice(vehicle.price, reputationLevel);
    const vehicleCard = createVehicleCard(vehicle, adjustedPrice);
    fragment.appendChild(vehicleCard);
  });

  container.appendChild(fragment);
}

// Optimized price update function
function updatePrices() {
  const elements = getCachedElements();
  const selectedReputation = elements.reputation?.value || 'neutral';
  renderVehicles(selectedReputation);
}

// Optimized search function with debouncing for better performance
let searchTimeout;
function filterVehicles() {
  // Clear previous timeout to debounce rapid typing
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    const elements = getCachedElements();
    const query = elements.vehicleSearch?.value.toLowerCase() || '';
    const allCards = elements.container?.querySelectorAll('.vehicle-card') || [];

    // Use requestAnimationFrame for smooth animations
    requestAnimationFrame(() => {
      allCards.forEach(card => {
        const nameElement = card.querySelector('h3');
        if (nameElement) {
          const name = nameElement.textContent.toLowerCase();
          card.style.display = name.includes(query) ? 'block' : 'none';
        }
      });
    });
  }, 150); // 150ms debounce delay
}

// Modal functions with improved accessibility and performance
function openModal(vehicle, adjustedPrice) {
  const elements = getCachedElements();

  if (!elements.modal) {
    console.error('Modal elements not found');
    return;
  }

  // Batch DOM updates for better performance
  requestAnimationFrame(() => {
    elements.modalTitle.textContent = vehicle.name;
    elements.modalImage.src = vehicle.photo;
    elements.modalImage.alt = vehicle.name;
    elements.modalPrice.textContent = formatPrice(adjustedPrice);
    elements.modalOres.textContent = vehicle.ores ? `Ores: ${vehicle.ores}` : '';
    elements.modalHoneycombs.textContent = vehicle.honeycombs ? `Honeycombs: ${vehicle.honeycombs}` : '';
    elements.modalCanisters.textContent = vehicle.Canisters ? `Canisters: ${vehicle.Canisters}` : '';
    elements.modalColors.textContent = vehicle.colors ? `Available Colors: ${vehicle.colors}` : 'Available Colors: TBD';
    elements.modalBuy.textContent = vehicle.whereToBuy ? `Where to Buy: ${vehicle.whereToBuy}` : 'Where to Buy: Vendor or Marketplace';
    elements.modalUse.textContent = vehicle.usage ? `Recommended Use: ${vehicle.usage}` : '';

    elements.modal.classList.remove('hidden');

    // Focus management for accessibility
    elements.modal.focus();
  });
}

function closeModal() {
  const elements = getCachedElements();
  if (elements.modal) {
    elements.modal.classList.add('hidden');
  }
}

// Enhanced event listener setup with proper error handling
function setupEventListeners() {
  const elements = getCachedElements();

  // Reputation change listener
  if (elements.reputation) {
    elements.reputation.addEventListener('change', updatePrices, { passive: true });
  }

  // Search input listener with debouncing
  if (elements.vehicleSearch) {
    elements.vehicleSearch.addEventListener('input', filterVehicles, { passive: true });
  }

  // Modal close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.modal && !elements.modal.classList.contains('hidden')) {
      closeModal();
    }
  }, { passive: true });

  // Modal close on backdrop click
  if (elements.modal) {
    elements.modal.addEventListener('click', (e) => {
      if (e.target === elements.modal) {
        closeModal();
      }
    }, { passive: true });
  }
}

// Optimized initialization with error handling and performance monitoring
function initializeApp() {
  try {
    // Check if required elements exist
    const container = document.getElementById('vehicle-container');
    if (!container) {
      console.error('Required DOM elements not found. Make sure vehicle-container exists.');
      return;
    }

    // Setup event listeners first
    setupEventListeners();

    // Initial render
    renderVehicles();

    console.log('Vehicle display initialized successfully');
  } catch (error) {
    console.error('Failed to initialize vehicle display:', error);
  }
}

// Enhanced DOM ready detection for better cross-browser compatibility
function domReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    // DOM is already ready
    callback();
  }
}

// Initialize when DOM is ready
domReady(initializeApp);

// Export functions for potential external use (if using modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderVehicles,
    updatePrices,
    filterVehicles,
    openModal,
    closeModal
  };
}