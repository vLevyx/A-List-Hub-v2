/**
 * Weapon Compatibility Table Manager
 */

class WeaponCompatibilityTable {
  // Static configuration
  static WEAPON_TYPES = {
    PISTOL: 'pistol',
    SHOTGUN: 'shotgun',
    SUBMACHINE: 'submachine',
    ASSAULT: 'assault',
    SNIPER: 'sniper',
    MACHINE_GUN: 'machine-gun'
  };

  static FIRE_MODES = {
    SAFE: { 
      key: 'safe', 
      angle: 0, 
      label: 'SAFE', 
      description: 'All weapons shown', 
      cssClass: 'mode-safe' 
    },
    SEMI: { 
      key: 'semi', 
      angle: 90, 
      label: 'SEMI', 
      description: 'Semi-automatic only', 
      cssClass: 'mode-semi' 
    },
    BURST: { 
      key: 'burst', 
      angle: 180, 
      label: 'BURST', 
      description: 'Burst fire capable', 
      cssClass: 'mode-burst' 
    },
    FULL: { 
      key: 'full', 
      angle: 270, 
      label: 'FULL', 
      description: 'Full-auto capable', 
      cssClass: 'mode-full' 
    }
  };

  static FIRE_MODE_CSS_CLASSES = {
    safe: 'fire-mode-safe',
    semi: 'fire-mode-semi',
    burst: 'fire-mode-burst',
    full: 'fire-mode-full',
    auto: 'fire-mode-auto'
  };

  static VIEW_MODES = {
    ALL: 'all',
    AMMO: 'ammo',
    ATTACHMENTS: 'attachments'
  };

  /**
   * Initialize the weapon compatibility table
   * @param {Object} config - Configuration object
   */
  constructor(config = {}) {
    this.config = {
      debounceMs: 300,
      ...config
    };

    // State management
    this.state = {
      currentView: WeaponCompatibilityTable.VIEW_MODES.ALL,
      currentFireMode: WeaponCompatibilityTable.FIRE_MODES.SAFE.key,
      searchTerm: '',
      selectedTypes: new Set(),
      selectedAttachments: new Set(),
      allAttachmentsSelected: true
    };

    // Data storage
    this.weaponData = this.initializeWeaponData();
    
    // DOM elements cache
    this.elements = {};
    
    // Event handlers bound to context
    this.boundHandlers = this.createBoundHandlers();
    
    // Debounced search handler
    this.debouncedSearch = this.debounce(this.handleSearch.bind(this), this.config.debounceMs);
  }

  /**
   * Initialize weapon data with proper structure
   * @returns {Array} Structured weapon data
   */
  initializeWeaponData() {
    return [
      // Pistols
      { weapon: 'Colt 1911', ammo: '8rnd .45 ACP', fireModes: 'Semi', attachments: 'None', type: WeaponCompatibilityTable.WEAPON_TYPES.PISTOL },
      { weapon: 'Desert Eagle', ammo: '.50 AE 7rnd Mag', fireModes: 'Semi', attachments: 'None', type: WeaponCompatibilityTable.WEAPON_TYPES.PISTOL },
      { weapon: 'M9', ammo: '9x19mm 15rnd M9 Mag', fireModes: 'Semi', attachments: 'None', type: WeaponCompatibilityTable.WEAPON_TYPES.PISTOL },
      { weapon: 'PM', ammo: '9x18mm 8rnd PM Mag', fireModes: 'Semi', attachments: 'None', type: WeaponCompatibilityTable.WEAPON_TYPES.PISTOL },

      // Shotguns
      { weapon: 'MP-43', ammo: '12/70 7mm Buckshot', fireModes: 'Semi', attachments: 'None', type: WeaponCompatibilityTable.WEAPON_TYPES.SHOTGUN },

      // Submachine Guns
      { weapon: 'MP5A2', ammo: '30rnd 9x19 MP5 Mag', fireModes: 'Full', attachments: 'EOTECH XPS3, Leupold VX-6, Reflex scope', type: WeaponCompatibilityTable.WEAPON_TYPES.SUBMACHINE },
      { weapon: 'MP7A2', ammo: '4.6x40 40rnd Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, and 4.7 mm Flash Hider', type: WeaponCompatibilityTable.WEAPON_TYPES.SUBMACHINE },

      // Assault Rifles
      { weapon: 'AK-74', ammo: '7.62x39mm 30rnd AK Mag', fireModes: 'Semi, Full', attachments: '6P20 Muzzle Brake', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },
      { weapon: 'AKS-74U', ammo: '5.45x39mm 30rnd AK Mag OR 45rnd RPK-74 Tracer Mag', fireModes: 'Semi, Full', attachments: '6P26 Flash Hider', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },
      { weapon: 'M16 Carbine', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Full', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight, and A2 Flash Hider', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },
      { weapon: 'M16A2', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Burst', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight, and A2 Flash Hider', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },
      { weapon: 'M16A2 Auto', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Burst, Full', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight, and A2 Flash Hider', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },
      { weapon: 'M416', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6 and A2 Flash Hider', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },
      { weapon: 'Sa-58P', ammo: '7.62x39mm 30rnd Sa-58 Mag', fireModes: 'Semi, Full', attachments: 'None', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },
      { weapon: 'Sa-58V', ammo: '7.62x39mm 30rnd Sa-58 Mag', fireModes: 'Semi, Full', attachments: 'None', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },
      { weapon: 'ScarH', ammo: '7.62x51 FMJ 20rnd Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6, and 7.62x51mm Flash Hider', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },
      { weapon: 'SIG MCX', ammo: '.300 Blackout Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6, and A2 Flash Hider', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },
      { weapon: 'SIG MCX SPEAR', ammo: '6.8x51mm 25rnd Mag', fireModes: 'Semi, Full', attachments: 'Leupold VX-6, 6.8x51mm Flash Hider', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },
      { weapon: 'Steyr AUG', ammo: '5.56x45 30rnd AUG Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, and Leupold VX-6', type: WeaponCompatibilityTable.WEAPON_TYPES.ASSAULT },

      // Sniper Rifles
      { weapon: 'M21 SWS', ammo: '7.62x51mm 20rnd M14 Mag', fireModes: 'Semi', attachments: 'ART II Scope', type: WeaponCompatibilityTable.WEAPON_TYPES.SNIPER },
      { weapon: 'SR25', ammo: '7.62x51 30rnd Mag', fireModes: 'Semi', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6, and 7.62x51mm Flash Hider', type: WeaponCompatibilityTable.WEAPON_TYPES.SNIPER },
      { weapon: 'SSG', ammo: '5rnd .338 FMJ', fireModes: 'Semi', attachments: 'ART II Scope', type: WeaponCompatibilityTable.WEAPON_TYPES.SNIPER },
      { weapon: 'SVD', ammo: '7.62x54mmR 10rnd SVD Mag', fireModes: 'Semi', attachments: 'PSO-1 Scope', type: WeaponCompatibilityTable.WEAPON_TYPES.SNIPER },

      // Machine Guns
      { weapon: 'M249 SAW', ammo: '5.56x45mm 200rnd M249 Belt', fireModes: 'Full', attachments: 'None', type: WeaponCompatibilityTable.WEAPON_TYPES.MACHINE_GUN },
      { weapon: 'PKM', ammo: '7.62x54mmR 100rnd PK Belt', fireModes: 'Full', attachments: 'None', type: WeaponCompatibilityTable.WEAPON_TYPES.MACHINE_GUN },
      { weapon: 'RPK-74', ammo: '5.45x39mm 45rnd RPK-74 Tracer Mag', fireModes: 'Full', attachments: 'None', type: WeaponCompatibilityTable.WEAPON_TYPES.MACHINE_GUN }
    ];
  }

  /**
   * Create bound event handlers to maintain context
   * @returns {Object} Object containing bound handler functions
   */
  createBoundHandlers() {
    return {
      handleFireSelectorClick: this.handleFireSelectorClick.bind(this),
      handleFilterButtonClick: this.handleFilterButtonClick.bind(this),
      handleViewToggleClick: this.handleViewToggleClick.bind(this),
      handleAttachmentChange: this.handleAttachmentChange.bind(this),
      handleSearchInput: this.handleSearchInput.bind(this)
    };
  }

  /**
   * Initialize the table after DOM is ready
   */
  init() {
    try {
      this.cacheElements();
      this.validateElements();
      this.setupEventListeners();
      this.updateStatistics();
      this.updateFireSelector(WeaponCompatibilityTable.FIRE_MODES.SAFE.key);
      this.renderTable();
    } catch (error) {
      console.error('Failed to initialize WeaponCompatibilityTable:', error);
    }
  }

  /**
   * Cache DOM elements for performance
   */
  cacheElements() {
    const elementIds = [
      'compatibilityTable', 'search', 'total-weapons', 'filtered-count', 
      'categories-count', 'fireSelector', 'selectorPointer', 'currentMode', 
      'modeDescription', 'all-attachments'
    ];

    elementIds.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });

    this.elements.tableBody = this.elements.compatibilityTable?.querySelector('tbody');
    this.elements.filterButtons = document.querySelectorAll('.filter-button');
    this.elements.viewToggles = document.querySelectorAll('.view-toggle');
    this.elements.attachmentCheckboxes = document.querySelectorAll('.attachment-checkbox');
  }

  /**
   * Validate that all required elements exist
   * @throws {Error} If required elements are missing
   */
  validateElements() {
    const requiredElements = ['compatibilityTable', 'search', 'fireSelector'];
    const missingElements = requiredElements.filter(id => !this.elements[id]);
    
    if (missingElements.length > 0) {
      throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
    }
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Fire selector
    this.elements.fireSelector?.addEventListener('click', this.boundHandlers.handleFireSelectorClick);

    // Filter buttons
    this.elements.filterButtons?.forEach(btn => {
      btn.addEventListener('click', this.boundHandlers.handleFilterButtonClick);
    });

    // View toggles
    this.elements.viewToggles?.forEach(toggle => {
      toggle.addEventListener('click', this.boundHandlers.handleViewToggleClick);
    });

    // Attachment checkboxes
    this.elements.attachmentCheckboxes?.forEach(checkbox => {
      checkbox.addEventListener('change', this.boundHandlers.handleAttachmentChange);
    });

    // Search input with debouncing
    this.elements.search?.addEventListener('input', this.boundHandlers.handleSearchInput);
  }

  /**
   * Handle fire selector click
   */
  handleFireSelectorClick() {
    const modes = Object.values(WeaponCompatibilityTable.FIRE_MODES);
    const currentIndex = modes.findIndex(mode => mode.key === this.state.currentFireMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    this.updateFireSelector(nextMode.key);
  }

  /**
   * Handle filter button click
   * @param {Event} event - Click event
   */
  handleFilterButtonClick(event) {
    const button = event.target;
    const type = button.dataset.type;
    
    if (!type) return;

    button.classList.toggle('selected');
    
    if (button.classList.contains('selected')) {
      this.state.selectedTypes.add(type);
    } else {
      this.state.selectedTypes.delete(type);
    }
    
    this.renderTable();
  }

  /**
   * Handle view toggle click
   * @param {Event} event - Click event
   */
  handleViewToggleClick(event) {
    const toggle = event.target;
    const view = toggle.dataset.view;
    
    if (!view) return;

    // Update UI
    this.elements.viewToggles?.forEach(t => t.classList.remove('active'));
    toggle.classList.add('active');
    
    // Update state
    this.state.currentView = view;
    this.renderTable();
  }

  /**
   * Handle attachment checkbox change
   * @param {Event} event - Change event
   */
  handleAttachmentChange(event) {
    const checkbox = event.target;
    const value = checkbox.value;

    if (value === 'all') {
      this.state.allAttachmentsSelected = checkbox.checked;
      this.state.selectedAttachments.clear();
      
      // Uncheck other checkboxes
      this.elements.attachmentCheckboxes?.forEach(cb => {
        if (cb !== checkbox) cb.checked = false;
      });
    } else {
      this.state.allAttachmentsSelected = false;
      this.elements['all-attachments'].checked = false;
      
      if (checkbox.checked) {
        this.state.selectedAttachments.add(value.toLowerCase());
      } else {
        this.state.selectedAttachments.delete(value.toLowerCase());
      }
      
      // If no attachments selected, select all
      if (this.state.selectedAttachments.size === 0) {
        this.state.allAttachmentsSelected = true;
        this.elements['all-attachments'].checked = true;
      }
    }
    
    this.renderTable();
  }

  /**
   * Handle search input with debouncing
   * @param {Event} event - Input event
   */
  handleSearchInput(event) {
    this.state.searchTerm = event.target.value.trim().toLowerCase();
    this.debouncedSearch();
  }

  /**
   * Execute search (called by debounced handler)
   */
  handleSearch() {
    this.renderTable();
  }

  /**
   * Update fire selector UI and state
   * @param {string} mode - Fire mode key
   */
  updateFireSelector(mode) {
    const modeData = Object.values(WeaponCompatibilityTable.FIRE_MODES)
      .find(m => m.key === mode);
    
    if (!modeData) return;

    // Update UI
    if (this.elements.selectorPointer) {
      this.elements.selectorPointer.style.transform = 
        `translateX(-50%) rotate(${modeData.angle}deg)`;
    }
    
    if (this.elements.currentMode) {
      this.elements.currentMode.textContent = modeData.label;
      this.elements.currentMode.className = `current-mode ${modeData.cssClass}`;
    }
    
    if (this.elements.modeDescription) {
      this.elements.modeDescription.textContent = modeData.description;
    }
    
    // Update state
    this.state.currentFireMode = mode;
    this.renderTable();
  }

  /**
   * Filter weapons based on current state
   * @returns {Array} Filtered weapon data
   */
  getFilteredWeapons() {
    return this.weaponData.filter(weapon => {
      return this.matchesTypeFilter(weapon) &&
             this.matchesSearchFilter(weapon) &&
             this.matchesFireModeFilter(weapon) &&
             this.matchesAttachmentFilter(weapon);
    });
  }

  /**
   * Check if weapon matches type filter
   * @param {Object} weapon - Weapon data
   * @returns {boolean} Match result
   */
  matchesTypeFilter(weapon) {
    return this.state.selectedTypes.size === 0 || 
           this.state.selectedTypes.has(weapon.type);
  }

  /**
   * Check if weapon matches search filter
   * @param {Object} weapon - Weapon data
   * @returns {boolean} Match result
   */
  matchesSearchFilter(weapon) {
    if (!this.state.searchTerm) return true;
    
    const searchFields = [weapon.weapon, weapon.ammo, weapon.attachments];
    return searchFields.some(field => 
      field.toLowerCase().includes(this.state.searchTerm)
    );
  }

  /**
   * Check if weapon matches fire mode filter
   * @param {Object} weapon - Weapon data
   * @returns {boolean} Match result
   */
  matchesFireModeFilter(weapon) {
    if (this.state.currentFireMode === 'safe') return true;
    return weapon.fireModes.toLowerCase().includes(this.state.currentFireMode);
  }

  /**
   * Check if weapon matches attachment filter
   * @param {Object} weapon - Weapon data
   * @returns {boolean} Match result
   */
  matchesAttachmentFilter(weapon) {
    if (this.state.allAttachmentsSelected || this.state.selectedAttachments.size === 0) {
      return true;
    }
    
    const attachmentText = weapon.attachments.toLowerCase();
    return Array.from(this.state.selectedAttachments)
      .some(attachment => attachmentText.includes(attachment));
  }

  /**
   * Generate HTML for fire mode badges
   * @param {string} fireModes - Comma-separated fire modes
   * @returns {string} HTML string
   */
  generateFireModeHTML(fireModes) {
    return fireModes.split(',')
      .map(mode => {
        const cleanMode = mode.trim().toLowerCase();
        const cssClass = WeaponCompatibilityTable.FIRE_MODE_CSS_CLASSES[cleanMode] || '';
        return `<span class="${cssClass}">${mode.trim()}</span>`;
      })
      .join(', ');
  }

  /**
   * Generate table row HTML
   * @param {Object} weapon - Weapon data
   * @returns {string} HTML string
   */
  generateWeaponRowHTML(weapon) {
    const hideAmmo = this.state.currentView === WeaponCompatibilityTable.VIEW_MODES.AMMO;
    const hideAttachments = this.state.currentView === WeaponCompatibilityTable.VIEW_MODES.ATTACHMENTS;
    
    return `
      <tr>
        <td class="weapon-name">${this.escapeHtml(weapon.weapon)}</td>
        <td class="ammo-info"${hideAmmo ? ' style="display:none;"' : ''}>${this.escapeHtml(weapon.ammo)}</td>
        <td class="fire-modes">${this.generateFireModeHTML(weapon.fireModes)}</td>
        <td class="attachments"${hideAttachments ? ' style="display:none;"' : ''}>${this.escapeHtml(weapon.attachments)}</td>
      </tr>
    `;
  }

  /**
   * Render the table with filtered data
   */
  renderTable() {
    if (!this.elements.tableBody) return;

    const filteredWeapons = this.getFilteredWeapons();
    
    this.elements.tableBody.innerHTML = filteredWeapons
      .map(weapon => this.generateWeaponRowHTML(weapon))
      .join('');
    
    this.updateFilteredCount(filteredWeapons.length);
  }

  /**
   * Update statistics display
   */
  updateStatistics() {
    if (this.elements['total-weapons']) {
      this.elements['total-weapons'].textContent = this.weaponData.length;
    }

    if (this.elements['categories-count']) {
      const uniqueTypes = new Set(this.weaponData.map(w => w.type));
      this.elements['categories-count'].textContent = uniqueTypes.size;
    }
  }

  /**
   * Update filtered count display
   * @param {number} count - Number of filtered items
   */
  updateFilteredCount(count) {
    if (this.elements['filtered-count']) {
      this.elements['filtered-count'].textContent = count;
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Debounce function to limit execution frequency
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
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
  }

  /**
   * Clean up resources and event listeners
   */
  destroy() {
    // Remove event listeners
    this.elements.fireSelector?.removeEventListener('click', this.boundHandlers.handleFireSelectorClick);
    this.elements.search?.removeEventListener('input', this.boundHandlers.handleSearchInput);
    
    this.elements.filterButtons?.forEach(btn => {
      btn.removeEventListener('click', this.boundHandlers.handleFilterButtonClick);
    });
    
    this.elements.viewToggles?.forEach(toggle => {
      toggle.removeEventListener('click', this.boundHandlers.handleViewToggleClick);
    });
    
    this.elements.attachmentCheckboxes?.forEach(checkbox => {
      checkbox.removeEventListener('change', this.boundHandlers.handleAttachmentChange);
    });

    // Clear references
    this.elements = {};
    this.weaponData = [];
    this.state = {};
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Global instance for debugging/testing
  window.weaponTable = new WeaponCompatibilityTable({
    debounceMs: 300
  });
  
  window.weaponTable.init();
});