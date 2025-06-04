document.addEventListener('DOMContentLoaded', () => {
  const data = [
    // Pistols
    { weapon: 'Colt 1911', ammo: '8rnd .45 ACP', fireModes: 'Semi', attachments: 'None', type: 'pistol' },
    { weapon: 'Desert Eagle', ammo: '.50 AE 7rnd Mag', fireModes: 'Semi', attachments: 'None', type: 'pistol' },
    { weapon: 'M9', ammo: '9x19mm 15rnd M9 Mag', fireModes: 'Semi', attachments: 'None', type: 'pistol' },
    { weapon: 'PM', ammo: '9x18mm 8rnd PM Mag', fireModes: 'Semi', attachments: 'None', type: 'pistol' },

    // Shotguns
    { weapon: 'MP-43', ammo: '12/70 7mm Buckshot', fireModes: 'Semi', attachments: 'None', type: 'shotgun' },

    // Submachine Guns
    { weapon: 'MP5A2', ammo: '30rnd 9x19 MP5 Mag', fireModes: 'Full', attachments: 'None', type: 'submachine' },
    { weapon: 'MP7A2', ammo: '4.6x40 40rnd Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter, 4.7 mm Flash Hider', type: 'submachine' },

    // Assault Rifles
    { weapon: 'AK-74', ammo: '7.62x39mm 30rnd AK Mag', fireModes: 'Semi, Full', attachments: '6P20 Muzzle Brake', type: 'assault' },
    { weapon: 'AKS-74U', ammo: '5.45x39mm 30rnd AK Mag OR 45rnd RPK-74 Tracer Mag', fireModes: 'Semi, Full', attachments: '6P26 Flash Hider', type: 'assault' },
    { weapon: 'M16 Carbine', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Full', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight, A2 Flash Hider', type: 'assault' },
    { weapon: 'M16A2', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Burst', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight, A2 Flash Hider', type: 'assault' },
    { weapon: 'M16A2 Auto', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Burst, Full', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight, A2 Flash Hider', type: 'assault' },
    { weapon: 'M416', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter, A2 Flash Hider', type: 'assault' },
    { weapon: 'Sa-58P', ammo: '7.62x39mm 30rnd Sa-58 Mag', fireModes: 'Semi, Full', attachments: 'None', type: 'assault' },
    { weapon: 'Sa-58V', ammo: '7.62x39mm 30rnd Sa-58 Mag', fireModes: 'Semi, Full', attachments: 'None', type: 'assault' },
    { weapon: 'ScarH', ammo: '7.62x51 FMJ 20rnd Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter, 7.62x51mm Flash Hider', type: 'assault' },
    { weapon: 'SIG MCX', ammo: '.300 Blackout Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter, A2 Flash Hider', type: 'assault' },
    { weapon: 'SIG MCX SPEAR', ammo: '6.8x51mm 25rnd Mag', fireModes: 'Semi, Full', attachments: '6.8x51mm Flash Hider', type: 'assault' },
    { weapon: 'Steyr AUG', ammo: '5.56x45 30rnd AUG Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter', type: 'assault' },

    // Sniper Rifles
    { weapon: 'M21 SWS', ammo: '7.62x51mm 20rnd M14 Mag', fireModes: 'Semi', attachments: 'ART II Scope', type: 'sniper' },
    { weapon: 'SR25', ammo: '7.62x51 30rnd Mag', fireModes: 'Semi', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter, 7.62x51mm Flash Hider', type: 'sniper' },
    { weapon: 'SSG', ammo: '5rnd .338 FMJ', fireModes: 'Semi', attachments: 'ART II Scope', type: 'sniper' },
    { weapon: 'SVD', ammo: '7.62x54mmR 10rnd SVD Mag', fireModes: 'Semi', attachments: 'PSO-1 Scope', type: 'sniper' },

    // Machine Guns
    { weapon: 'M249 SAW', ammo: '5.56x45mm 200rnd M249 Belt', fireModes: 'Full', attachments: 'None', type: 'machine-gun' },
    { weapon: 'PKM', ammo: '7.62x54mmR 100rnd PK Belt', fireModes: 'Full', attachments: 'None', type: 'machine-gun' },
    { weapon: 'RPK-74', ammo: '5.45x39mm 45rnd RPK-74 Tracer Mag', fireModes: 'Full', attachments: 'None', type: 'machine-gun' }
  ];

  const tableBody = document.querySelector('#compatibilityTable tbody');
  const searchInput = document.getElementById('search');
  const filterButtons = document.querySelectorAll('.filter-button');
  const viewToggles = document.querySelectorAll('.view-toggle');
  const attachmentCheckboxes = document.querySelectorAll('.attachment-checkbox');
  const allCheckbox = document.getElementById('all-attachments');
  const totalWeaponsEl = document.getElementById('total-weapons');
  const filteredCountEl = document.getElementById('filtered-count');
  const categoriesCountEl = document.getElementById('categories-count');

  const fireSelector = document.getElementById('fireSelector');
  const selectorPointer = document.getElementById('selectorPointer');
  const currentModeEl = document.getElementById('currentMode');
  const modeDescriptionEl = document.getElementById('modeDescription');

  let currentView = 'all';
  let currentFireMode = 'safe';

  const fireModes = {
    safe: { angle: 0, label: 'SAFE', description: 'All weapons shown', class: 'mode-safe' },
    semi: { angle: 90, label: 'SEMI', description: 'Semi-automatic only', class: 'mode-semi' },
    burst: { angle: 180, label: 'BURST', description: 'Burst fire capable', class: 'mode-burst' },
    full: { angle: 270, label: 'FULL', description: 'Full-auto capable', class: 'mode-full' }
  };

  totalWeaponsEl.textContent = data.length;
  categoriesCountEl.textContent = new Set(data.map(w => w.type)).size;

  function updateFireSelector(mode) {
    const modeData = fireModes[mode];
    selectorPointer.style.transform = `translateX(-50%) rotate(${modeData.angle}deg)`;
    currentModeEl.textContent = modeData.label;
    currentModeEl.className = `current-mode ${modeData.class}`;
    modeDescriptionEl.textContent = modeData.description;
    currentFireMode = mode;
    populateTable(searchInput.value, getSelectedTypes());
  }

  fireSelector.addEventListener('click', () => {
    const modes = ['safe', 'semi', 'burst', 'full'];
    const nextIndex = (modes.indexOf(currentFireMode) + 1) % modes.length;
    updateFireSelector(modes[nextIndex]);
  });

  function getSelectedTypes() {
    const selected = [];
    filterButtons.forEach(btn => {
      if (btn.classList.contains('selected')) selected.push(btn.dataset.type);
    });
    return selected.length > 0 ? selected : null;
  }

  function getSelectedAttachments() {
    const selected = Array.from(attachmentCheckboxes)
      .filter(cb => cb.checked && cb.value !== 'all')
      .map(cb => cb.value.toLowerCase());
    return selected;
  }

  function matchesFireMode(weaponModes) {
    if (currentFireMode === 'safe') return true;
    return weaponModes.toLowerCase().includes(currentFireMode);
  }

  function matchesAttachments(attachmentsText) {
    const selected = getSelectedAttachments();
    if (allCheckbox.checked || selected.length === 0) return true;
    return selected.some(att => attachmentsText.toLowerCase().includes(att));
  }

  function populateTable(searchTerm = '', selectedTypes = null) {
    const term = searchTerm.trim().toLowerCase();
    const filtered = data.filter(weapon => {
      const matchesType = !selectedTypes || selectedTypes.includes(weapon.type);
      const matchesSearch = !term || weapon.weapon.toLowerCase().includes(term) || weapon.ammo.toLowerCase().includes(term) || weapon.attachments.toLowerCase().includes(term);
      const matchesFire = matchesFireMode(weapon.fireModes);
      const matchesAttach = matchesAttachments(weapon.attachments);
      return matchesType && matchesSearch && matchesFire && matchesAttach;
    });

    tableBody.innerHTML = filtered.map(weapon => `
        <tr>
          <td class="weapon-name">${weapon.weapon}</td>
          <td class="ammo-info"${currentView === 'ammo' ? ' style="display:none;"' : ''}>${weapon.ammo}</td>
          <td class="fire-modes">
  ${weapon.fireModes.split(',').map(mode => {
      const clean = mode.trim().toLowerCase();
      const classMap = {
        safe: 'fire-mode-safe',
        semi: 'fire-mode-semi',
        burst: 'fire-mode-burst',
        full: 'fire-mode-full',
        auto: 'fire-mode-auto'
      };
      const cssClass = classMap[clean] || '';
      return `<span class="${cssClass}">${mode.trim()}</span>`;
    }).join(', ')}
</td>
          <td class="attachments"${currentView === 'attachments' ? ' style="display:none;"' : ''}>${weapon.attachments}</td>
        </tr>
      `).join('');

    filteredCountEl.textContent = filtered.length;
  }

  // Category filter
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      populateTable(searchInput.value, getSelectedTypes());
    });
  });

  // View toggle
  viewToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      viewToggles.forEach(t => t.classList.remove('active'));
      toggle.classList.add('active');
      currentView = toggle.dataset.view;
      populateTable(searchInput.value, getSelectedTypes());
    });
  });

  // Attachment filter logic
  attachmentCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.value === 'all') {
        attachmentCheckboxes.forEach(other => {
          if (other !== cb) other.checked = false;
        });
      } else {
        allCheckbox.checked = false;
      }

      const noneChecked = Array.from(attachmentCheckboxes).every(cb => !cb.checked);
      if (noneChecked) allCheckbox.checked = true;

      populateTable(searchInput.value, getSelectedTypes());
    });
  });

  // Search input
  searchInput.addEventListener('input', () => {
    populateTable(searchInput.value, getSelectedTypes());
  });

  // Initial render
  updateFireSelector('safe');
});