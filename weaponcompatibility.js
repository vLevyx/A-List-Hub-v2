document.addEventListener('DOMContentLoaded', () => {
  const data = [
    { weapon: 'PM', ammo: '9x18mm 8rnd PM Mag', fireModes: 'Semi', attachments: 'None', type: 'pistol' },
    { weapon: 'M9', ammo: '9x19mm 15rnd M9 Mag', fireModes: 'Semi', attachments: 'None', type: 'pistol' },
    { weapon: 'Colt 1911', ammo: '8rnd .45 ACP', fireModes: 'Semi', attachments: 'None', type: 'pistol' },
    { weapon: 'Desert Eagle', ammo: '.50 AE 7rnd Mag', fireModes: 'Semi', attachments: 'None', type: 'pistol' },
    { weapon: 'MP-43', ammo: '12/70 7mm Buckshot', fireModes: 'Semi', attachments: 'None', type: 'shotgun' },
    { weapon: 'MP5A2', ammo: '30rnd 9x19 MP5 Mag', fireModes: 'Full', attachments: 'None', type: 'submachine' },
    { weapon: 'M16 Carbine', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Full', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight', type: 'submachine' },
    { weapon: 'MP7A2', ammo: '4.6x40 40rnd Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter', type: 'submachine' },
    { weapon: 'M16A2', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Burst', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight', type: 'assault' },
    { weapon: 'M16A2 Auto', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Burst, Full', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight', type: 'assault' },
    { weapon: 'M416', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter', type: 'assault' },
    { weapon: 'Sa-58P', ammo: '7.62x39mm 30rnd Sa-58 Mag', fireModes: 'Semi, Full', attachments: 'None', type: 'assault' },
    { weapon: 'Sa-58V', ammo: '7.62x39mm 30rnd Sa-58 Mag', fireModes: 'Semi, Full', attachments: 'None', type: 'assault' },
    { weapon: 'AK-74', ammo: '5.45x39mm 30rnd AK Mag OR 45rnd RPK-74 Tracer Mag', fireModes: 'Semi, Full', attachments: 'None', type: 'assault' },
    { weapon: 'AKS74U', ammo: '5.45x39mm 30rnd AK Mag OR 45rnd RPK-74 Tracer Mag', fireModes: 'Semi, Full', attachments: 'None', type: 'assault' },
    { weapon: 'AUG', ammo: '5.56x45 30rnd AUG Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter', type: 'assault' },
    { weapon: 'SIG MCX', ammo: '.300 Blackout Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter', type: 'assault' },
    { weapon: 'ScarH', ammo: '7.62x51 FMJ 20rnd Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter', type: 'assault' },
    { weapon: 'M21 SWS', ammo: '7.62x51mm 20rnd M14 Mag', fireModes: 'Semi', attachments: 'ART II Scope', type: 'sniper' },
    { weapon: 'SSG', ammo: '5rnd .338 FMJ', fireModes: 'Semi', attachments: 'ART II Scope', type: 'sniper' },
    { weapon: 'SVD', ammo: '7.62x54mmR 10rnd SVD Mag', fireModes: 'Semi', attachments: 'PSO-1 Scope', type: 'sniper' },
    { weapon: 'SR25', ammo: '7.62x51 30rnd Mag', fireModes: 'Semi', attachments: 'EOTECH XPS3, Reflex scope and Elcan Specter', type: 'sniper' },
    { weapon: 'RPK-74', ammo: '5.45x39mm 45rnd RPK-74 Tracer Mag', fireModes: 'Full', attachments: 'None', type: 'machine-gun' },
    { weapon: 'M249 SAW', ammo: '5.56x45mm 200rnd M249 Belt', fireModes: 'Full', attachments: 'None', type: 'machine-gun' },
    { weapon: 'PKM', ammo: '7.62x54mmR 100rnd PK Belt', fireModes: 'Full', attachments: 'None', type: 'machine-gun' }
  ];

  const tableBody = document.querySelector('#compatibilityTable tbody');
  const searchInput = document.getElementById('search');
  const filterButtons = document.querySelectorAll('.filter-button');
  const viewToggles = document.querySelectorAll('.view-toggle');
  const attachmentCheckboxes = document.querySelectorAll('.attachment-checkbox');
  const allCheckbox = Array.from(attachmentCheckboxes).find(cb => cb.value.toLowerCase() === 'all');

  let currentView = 'all';

  function getSelectedTypes() {
    return Array.from(filterButtons)
      .filter(btn => btn.classList.contains('selected'))
      .map(btn => btn.dataset.type);
  }

  function getSelectedAttachments() {
    const selected = Array.from(attachmentCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value.toLowerCase());
    return selected.includes("all") || selected.length === 0 ? [] : selected;
  }

  function populateTable(filter = '', selectedTypes = []) {
    const selectedAttachments = getSelectedAttachments();
    tableBody.innerHTML = '';

    const filtered = data.filter(item => {
      const matchesSearch = (item.weapon + item.ammo + item.attachments).toLowerCase().includes(filter.toLowerCase());
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(item.type);
      const matchesAttachment = selectedAttachments.length === 0 ||
        selectedAttachments.some(att => item.attachments.toLowerCase().includes(att));
      return matchesSearch && matchesType && matchesAttachment;
    });

    filtered.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
          <td>${item.weapon}</td>
          <td>${currentView === 'attachments' ? '-' : item.ammo}</td>
          <td>${item.fireModes}</td>
          <td>${currentView === 'ammo' ? '-' : item.attachments}</td>
        `;
      tableBody.appendChild(row);
    });
  }

  attachmentCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = Array.from(attachmentCheckboxes).filter(c => c.checked && c !== allCheckbox);

      // If "All Attachments" is selected, uncheck and enable all others
      if (cb === allCheckbox && cb.checked) {
        attachmentCheckboxes.forEach(other => {
          if (other !== allCheckbox) {
            other.checked = false;
          }
        });
      } else {
        // If any individual is selected, uncheck "All"
        allCheckbox.checked = false;

        // If nothing is selected, default back to "All"
        if (selected.length === 0) {
          allCheckbox.checked = true;
        }
      }

      populateTable(searchInput.value, getSelectedTypes());
    });
  });

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      populateTable(searchInput.value, getSelectedTypes());
    });
  });

  viewToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      populateTable(searchInput.value, getSelectedTypes());
    });
  });

  searchInput.addEventListener('input', () => populateTable(searchInput.value, getSelectedTypes()));

  populateTable();
});
