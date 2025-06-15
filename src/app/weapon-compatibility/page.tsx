'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePageTracking } from '@/hooks/usePageTracking'
import { useAuth } from '@/hooks/useAuth'

// Types
interface WeaponData {
  weapon: string
  ammo: string
  fireModes: string
  attachments: string
  type: string
}

interface FireMode {
  key: string
  angle: number
  label: string
  description: string
  cssClass: string
}

// Constants
const WEAPON_TYPES = {
  PISTOL: 'pistol',
  SHOTGUN: 'shotgun',
  SUBMACHINE: 'submachine',
  ASSAULT: 'assault',
  SNIPER: 'sniper',
  MACHINE_GUN: 'machine-gun'
}

const FIRE_MODES = {
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
}

const FIRE_MODE_CSS_CLASSES = {
  safe: 'text-white',
  semi: 'text-green-400',
  burst: 'text-yellow-400',
  full: 'text-red-400',
  auto: 'text-red-400'
}

const VIEW_MODES = {
  ALL: 'all',
  AMMO: 'ammo',
  ATTACHMENTS: 'attachments'
}

export default function WeaponCompatibilityPage() {
  usePageTracking()
  const { hasAccess, loading } = useAuth()

  // State
  const [currentView, setCurrentView] = useState<string>(VIEW_MODES.ALL)
  const [currentFireMode, setCurrentFireMode] = useState<string>(FIRE_MODES.SAFE.key)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [selectedAttachments, setSelectedAttachments] = useState<Set<string>>(new Set())
  const [allAttachmentsSelected, setAllAttachmentsSelected] = useState<boolean>(true)
  const [filteredWeapons, setFilteredWeapons] = useState<WeaponData[]>([])

  // Refs
  const selectorPointerRef = useRef<HTMLDivElement>(null)
  const currentModeRef = useRef<HTMLDivElement>(null)
  const modeDescriptionRef = useRef<HTMLDivElement>(null)

  // Weapon data
  const weaponData = useRef<WeaponData[]>([
    // Pistols
    { weapon: 'Colt 1911', ammo: '8rnd .45 ACP', fireModes: 'Semi', attachments: 'None', type: WEAPON_TYPES.PISTOL },
    { weapon: 'Desert Eagle', ammo: '.50 AE 7rnd Mag', fireModes: 'Semi', attachments: 'None', type: WEAPON_TYPES.PISTOL },
    { weapon: 'M9', ammo: '9x19mm 15rnd M9 Mag', fireModes: 'Semi', attachments: 'None', type: WEAPON_TYPES.PISTOL },
    { weapon: 'PM', ammo: '9x18mm 8rnd PM Mag', fireModes: 'Semi', attachments: 'None', type: WEAPON_TYPES.PISTOL },

    // Shotguns
    { weapon: 'MP-43', ammo: '12/70 7mm Buckshot', fireModes: 'Semi', attachments: 'None', type: WEAPON_TYPES.SHOTGUN },

    // Submachine Guns
    { weapon: 'MP5A2', ammo: '30rnd 9x19 MP5 Mag', fireModes: 'Full', attachments: 'EOTECH XPS3, Leupold VX-6, Reflex scope', type: WEAPON_TYPES.SUBMACHINE },
    { weapon: 'MP7A2', ammo: '4.6x40 40rnd Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, and 4.7 mm Flash Hider', type: WEAPON_TYPES.SUBMACHINE },

    // Assault Rifles
    { weapon: 'AK-74', ammo: '7.62x39mm 30rnd AK Mag', fireModes: 'Semi, Full', attachments: '6P20 Muzzle Brake', type: WEAPON_TYPES.ASSAULT },
    { weapon: 'AKS-74U', ammo: '5.45x39mm 30rnd AK Mag OR 45rnd RPK-74 Tracer Mag', fireModes: 'Semi, Full', attachments: '6P26 Flash Hider', type: WEAPON_TYPES.ASSAULT },
    { weapon: 'M16 Carbine', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Full', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight, and A2 Flash Hider', type: WEAPON_TYPES.ASSAULT },
    { weapon: 'M16A2', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Burst', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight, and A2 Flash Hider', type: WEAPON_TYPES.ASSAULT },
    { weapon: 'M16A2 Auto', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Burst, Full', attachments: '4x20 Carry Handle Scope, Carry Handle Red Dot Sight, and A2 Flash Hider', type: WEAPON_TYPES.ASSAULT },
    { weapon: 'M416', ammo: '5.56x45mm 30rnd STANAG Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6 and A2 Flash Hider', type: WEAPON_TYPES.ASSAULT },
    { weapon: 'Sa-58P', ammo: '7.62x39mm 30rnd Sa-58 Mag', fireModes: 'Semi, Full', attachments: 'None', type: WEAPON_TYPES.ASSAULT },
    { weapon: 'Sa-58V', ammo: '7.62x39mm 30rnd Sa-58 Mag', fireModes: 'Semi, Full', attachments: 'None', type: WEAPON_TYPES.ASSAULT },
    { weapon: 'ScarH', ammo: '7.62x51 FMJ 20rnd Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6, and 7.62x51mm Flash Hider', type: WEAPON_TYPES.ASSAULT },
    { weapon: 'SIG MCX', ammo: '.300 Blackout Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6, and A2 Flash Hider', type: WEAPON_TYPES.ASSAULT },
    { weapon: 'SIG MCX SPEAR', ammo: '6.8x51mm 25rnd Mag', fireModes: 'Semi, Full', attachments: 'Leupold VX-6, 6.8x51mm Flash Hider', type: WEAPON_TYPES.ASSAULT },
    { weapon: 'Steyr AUG', ammo: '5.56x45 30rnd AUG Mag', fireModes: 'Semi, Full', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, and Leupold VX-6', type: WEAPON_TYPES.ASSAULT },

    // Sniper Rifles
    { weapon: 'M21 SWS', ammo: '7.62x51mm 20rnd M14 Mag', fireModes: 'Semi', attachments: 'ART II Scope', type: WEAPON_TYPES.SNIPER },
    { weapon: 'SR25', ammo: '7.62x51 30rnd Mag', fireModes: 'Semi', attachments: 'EOTECH XPS3, Reflex scope, Elcan Specter, Leupold VX-6, and 7.62x51mm Flash Hider', type: WEAPON_TYPES.SNIPER },
    { weapon: 'SSG', ammo: '5rnd .338 FMJ', fireModes: 'Semi', attachments: 'ART II Scope', type: WEAPON_TYPES.SNIPER },
    { weapon: 'SVD', ammo: '7.62x54mmR 10rnd SVD Mag', fireModes: 'Semi', attachments: 'PSO-1 Scope', type: WEAPON_TYPES.SNIPER },

    // Machine Guns
    { weapon: 'M249 SAW', ammo: '5.56x45mm 200rnd M249 Belt', fireModes: 'Full', attachments: 'None', type: WEAPON_TYPES.MACHINE_GUN },
    { weapon: 'PKM', ammo: '7.62x54mmR 100rnd PK Belt', fireModes: 'Full', attachments: 'None', type: WEAPON_TYPES.MACHINE_GUN },
    { weapon: 'RPK-74', ammo: '5.45x39mm 45rnd RPK-74 Tracer Mag', fireModes: 'Full', attachments: 'None', type: WEAPON_TYPES.MACHINE_GUN }
  ]).current

  // Redirect if no access
  useEffect(() => {
    if (!loading && !hasAccess) {
      window.location.href = '/'
    }
  }, [hasAccess, loading])

  // Filter weapons based on current state
  const filterWeapons = useCallback(() => {
    const filtered = weaponData.filter(weapon => {
      // Type filter
      const matchesType = selectedTypes.size === 0 || selectedTypes.has(weapon.type)
      
      // Search filter
      const matchesSearch = !searchTerm || 
        [weapon.weapon, weapon.ammo, weapon.attachments].some(field => 
          field.toLowerCase().includes(searchTerm.toLowerCase())
        )
      
      // Fire mode filter
      const matchesFireMode = currentFireMode === 'safe' || 
        weapon.fireModes.toLowerCase().includes(currentFireMode)
      
      // Attachment filter
      const matchesAttachment = allAttachmentsSelected || 
        selectedAttachments.size === 0 || 
        Array.from(selectedAttachments).some(attachment => 
          weapon.attachments.toLowerCase().includes(attachment)
        )
      
      return matchesType && matchesSearch && matchesFireMode && matchesAttachment
    })
    
    setFilteredWeapons(filtered)
  }, [
    weaponData, 
    selectedTypes, 
    searchTerm, 
    currentFireMode, 
    allAttachmentsSelected, 
    selectedAttachments
  ])

  // Update filtered weapons when filters change
  useEffect(() => {
    filterWeapons()
  }, [filterWeapons])

  // Update fire selector UI
  const updateFireSelector = useCallback((mode: string) => {
    const modeData = Object.values(FIRE_MODES).find(m => m.key === mode)
    if (!modeData) return
    
    if (selectorPointerRef.current) {
      selectorPointerRef.current.style.transform = `translateX(-50%) rotate(${modeData.angle}deg)`
    }
    
    if (currentModeRef.current) {
      currentModeRef.current.textContent = modeData.label
      currentModeRef.current.className = `text-xl font-bold mb-1 ${modeData.cssClass === 'mode-safe' ? 'text-white' : 
        modeData.cssClass === 'mode-semi' ? 'text-green-400' : 
        modeData.cssClass === 'mode-burst' ? 'text-yellow-400' : 
        'text-red-400'}`
    }
    
    if (modeDescriptionRef.current) {
      modeDescriptionRef.current.textContent = modeData.description
    }
    
    setCurrentFireMode(mode)
  }, [])

  // Handle fire selector click
  const handleFireSelectorClick = () => {
    const modes = Object.values(FIRE_MODES)
    const currentIndex = modes.findIndex(mode => mode.key === currentFireMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    updateFireSelector(nextMode.key)
  }

  // Handle filter button click
  const handleFilterButtonClick = (type: string) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }

  // Handle view toggle click
  const handleViewToggleClick = (view: string) => {
    setCurrentView(view)
  }

  // Handle attachment checkbox change
  const handleAttachmentChange = (value: string, checked: boolean) => {
    if (value === 'all') {
      setAllAttachmentsSelected(checked)
      setSelectedAttachments(new Set())
    } else {
      setAllAttachmentsSelected(false)
      
      setSelectedAttachments(prev => {
        const newSet = new Set(prev)
        if (checked) {
          newSet.add(value.toLowerCase())
        } else {
          newSet.delete(value.toLowerCase())
        }
        
        // If no attachments selected, select all
        if (newSet.size === 0) {
          setAllAttachmentsSelected(true)
        }
        
        return newSet
      })
    }
  }

  // Generate HTML for fire mode badges
  const generateFireModeHTML = (fireModes: string) => {
    return fireModes.split(',').map((mode, index) => {
      const cleanMode = mode.trim().toLowerCase()
      const cssClass = FIRE_MODE_CSS_CLASSES[cleanMode as keyof typeof FIRE_MODE_CSS_CLASSES] || ''
      return (
        <span key={index} className={cssClass}>
          {index > 0 && <span className="text-gray-400">, </span>}
          {mode.trim()}
        </span>
      )
    })
  }

  // Debounce search input
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout
    
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // Handle search input with debouncing
  const handleSearchInput = debounce((value: string) => {
    setSearchTerm(value.trim().toLowerCase())
  }, 300)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c6ff]"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#00c6ff] mb-2">Weapon Compatibility Viewer</h1>
          <p className="text-[#888] text-lg">Comprehensive firearm specifications and attachment compatibility</p>
        </div>

        <div className="bg-[#111] rounded-xl border border-[#333] p-6 mb-8 space-y-6">
          {/* Search Section */}
          <div className="space-y-2">
            <label htmlFor="search" className="text-[#00c6ff] font-semibold flex items-center gap-2">
              Search Weapons
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by weapon name, ammo type, or attachments..."
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-full p-3 bg-[#1a1a1a] border-2 border-[#333] rounded-lg text-white focus:outline-none focus:border-[#00c6ff] focus:ring-2 focus:ring-[#00c6ff]/10 transition-all"
            />
          </div>

          {/* Weapon Categories */}
          <div className="space-y-3">
            <div className="text-[#00c6ff] font-semibold flex items-center gap-2">
              <div className="w-1 h-4 bg-[#00c6ff] rounded"></div>
              Weapon Categories
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.values(WEAPON_TYPES).map((type) => (
                <button
                  key={type}
                  onClick={() => handleFilterButtonClick(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedTypes.has(type)
                      ? 'bg-[#00c6ff] text-black border-[#00c6ff]'
                      : 'bg-[#1a1a1a] text-white border-[#333] hover:border-[#00c6ff] hover:bg-[#00c6ff]/10'
                  } border-2`}
                >
                  {type === 'pistol' ? 'Pistols' :
                   type === 'shotgun' ? 'Shotguns' :
                   type === 'submachine' ? 'SMGs' :
                   type === 'assault' ? 'Assault Rifles' :
                   type === 'sniper' ? 'Sniper Rifles' :
                   'Machine Guns'}
                </button>
              ))}
            </div>
          </div>

          {/* Fire Mode Selector */}
          <div className="space-y-3">
            <div className="text-[#00c6ff] font-semibold flex items-center gap-2">
              <div className="w-1 h-4 bg-[#00c6ff] rounded"></div>
              Fire Mode Selector
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <div 
                className="relative w-28 h-28 bg-gradient-radial from-[#2a2a2a] to-[#1a1a1a] rounded-full border-3 border-[#333] shadow-inner cursor-pointer"
                onClick={handleFireSelectorClick}
              >
                {/* Selector background */}
                <div className="absolute top-1/2 left-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-[#333] to-[#222] shadow-inner"></div>
                
                {/* Pointer */}
                <div 
                  ref={selectorPointerRef}
                  className="absolute top-2.5 left-1/2 w-1 h-6 bg-gradient-to-b from-[#ff4444] to-[#cc0000] -translate-x-1/2 rounded-sm shadow-md origin-center [transform:translateY(0)_rotate(0deg)]"
                  style={{ transformOrigin: 'center 50px' }}
                ></div>
                
                {/* Labels */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-xs font-bold text-white text-shadow">SAFE</div>
                <div className="absolute top-1/2 right-1.5 -translate-y-1/2 text-xs font-bold text-green-400 text-shadow">SEMI</div>
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-xs font-bold text-yellow-400 text-shadow">BURST</div>
                <div className="absolute top-1/2 left-1.5 -translate-y-1/2 text-xs font-bold text-red-400 text-shadow">FULL</div>
                
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#444] shadow-inner z-10"></div>
              </div>
              
              <div className="bg-[#1a1a1a] p-4 rounded-lg border-2 border-[#333] min-w-[120px] text-center">
                <div ref={currentModeRef} className="text-xl font-bold mb-1">SAFE</div>
                <div ref={modeDescriptionRef} className="text-sm text-[#888]">All weapons shown</div>
              </div>
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-3">
            <div className="text-[#00c6ff] font-semibold flex items-center gap-2">
              <div className="w-1 h-4 bg-[#00c6ff] rounded"></div>
              Display Options
            </div>
            <div className="flex bg-[#1a1a1a] rounded-lg border border-[#333] overflow-hidden">
              {Object.values(VIEW_MODES).map((view) => (
                <button
                  key={view}
                  onClick={() => handleViewToggleClick(view)}
                  className={`flex-1 py-2.5 px-4 text-sm font-medium transition-all ${
                    currentView === view
                      ? 'bg-[#00c6ff] text-black'
                      : 'bg-transparent text-white hover:bg-[#00c6ff]/10'
                  }`}
                >
                  {view === 'all' ? 'All Info' :
                   view === 'ammo' ? 'Hide Ammo' :
                   'Hide Attachments'}
                </button>
              ))}
            </div>
          </div>

          {/* Attachment Filters */}
          <div className="space-y-3">
            <div className="text-[#00c6ff] font-semibold flex items-center gap-2">
              <div className="w-1 h-4 bg-[#00c6ff] rounded"></div>
              Attachment Filters
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* General */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allAttachmentsSelected}
                  onChange={(e) => handleAttachmentChange('all', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>All Attachments</span>
              </label>

              {/* Optics / Sights */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('red dot')}
                  onChange={(e) => handleAttachmentChange('red dot', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>Red Dot</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('reflex')}
                  onChange={(e) => handleAttachmentChange('reflex', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>Reflex</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('eotech')}
                  onChange={(e) => handleAttachmentChange('eotech', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>EOTECH</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('elcan')}
                  onChange={(e) => handleAttachmentChange('elcan', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>Elcan</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('leupold')}
                  onChange={(e) => handleAttachmentChange('leupold', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>Leupold</span>
              </label>

              {/* Scopes */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('art')}
                  onChange={(e) => handleAttachmentChange('art', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>ART Scope</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('pso-1')}
                  onChange={(e) => handleAttachmentChange('pso-1', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>PSO-1 Scope</span>
              </label>

              {/* Carry Handle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('carry handle')}
                  onChange={(e) => handleAttachmentChange('carry handle', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>Carry Handle</span>
              </label>

              {/* Muzzle Attachments */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('4.7 mm flash hider')}
                  onChange={(e) => handleAttachmentChange('4.7 mm flash hider', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>4.77mm Flash Hider</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('a2 flash hider')}
                  onChange={(e) => handleAttachmentChange('a2 flash hider', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>A2 Flash Hider</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('6.8x51mm flash hider')}
                  onChange={(e) => handleAttachmentChange('6.8x51mm flash hider', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>6.8x51mm Flash Hider</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('6p26 flash hider')}
                  onChange={(e) => handleAttachmentChange('6p26 flash hider', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>6P26 Flash Hider</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('7.62x51mm flash hider')}
                  onChange={(e) => handleAttachmentChange('7.62x51mm flash hider', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>7.62x51mm Flash Hider</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('6p20 muzzle brake')}
                  onChange={(e) => handleAttachmentChange('6p20 muzzle brake', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>6P20 Muzzle Brake</span>
              </label>
              
              {/* None */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttachments.has('none')}
                  onChange={(e) => handleAttachmentChange('none', e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1a1a1a] border-2 border-[#333] text-[#00c6ff] focus:ring-[#00c6ff]/20"
                />
                <span>None</span>
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col md:flex-row justify-center gap-6 mb-6 p-5 bg-[#111] rounded-lg border border-[#333]">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00c6ff]">{weaponData.length}</div>
            <div className="text-sm text-[#888] mt-1">Total Weapons</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00c6ff]">{filteredWeapons.length}</div>
            <div className="text-sm text-[#888] mt-1">Showing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00c6ff]">6</div>
            <div className="text-sm text-[#888] mt-1">Categories</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#111] rounded-xl border border-[#333] shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1a1a] sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-left text-[#00c6ff] font-semibold border-b-2 border-[#333]">Weapon</th>
                  <th className={`p-4 text-left text-[#00c6ff] font-semibold border-b-2 border-[#333] ${currentView === VIEW_MODES.AMMO ? 'hidden' : ''}`}>Ammunition</th>
                  <th className="p-4 text-left text-[#00c6ff] font-semibold border-b-2 border-[#333]">Fire Modes</th>
                  <th className={`p-4 text-left text-[#00c6ff] font-semibold border-b-2 border-[#333] ${currentView === VIEW_MODES.ATTACHMENTS ? 'hidden' : ''}`}>Attachments</th>
                </tr>
              </thead>
              <tbody>
                {filteredWeapons.length > 0 ? (
                  filteredWeapons.map((weapon, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-[#222] hover:bg-[rgba(0,198,255,0.05)] transition-colors"
                    >
                      <td className="p-4 font-semibold text-white">{weapon.weapon}</td>
                      <td className={`p-4 font-mono text-[#ccc] text-sm ${currentView === VIEW_MODES.AMMO ? 'hidden' : ''}`}>{weapon.ammo}</td>
                      <td className="p-4 font-medium">{generateFireModeHTML(weapon.fireModes)}</td>
                      <td className={`p-4 text-white text-sm max-w-[200px] break-words ${currentView === VIEW_MODES.ATTACHMENTS ? 'hidden' : ''}`}>{weapon.attachments}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-[#888] text-lg">
                      No weapons match your current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .bg-gradient-radial {
          background-image: radial-gradient(var(--tw-gradient-stops));
        }
        
        .from-\[\#2a2a2a\] {
          --tw-gradient-from: #2a2a2a var(--tw-gradient-from-position);
          --tw-gradient-to: rgb(42 42 42 / 0) var(--tw-gradient-to-position);
          --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);
        }
        
        .to-\[\#1a1a1a\] {
          --tw-gradient-to: #1a1a1a var(--tw-gradient-to-position);
        }
        
        .from-\[\#333\] {
          --tw-gradient-from: #333 var(--tw-gradient-from-position);
          --tw-gradient-to: rgb(51 51 51 / 0) var(--tw-gradient-to-position);
          --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);
        }
        
        .to-\[\#222\] {
          --tw-gradient-to: #222 var(--tw-gradient-to-position);
        }
        
        .text-shadow {
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }
        
        .shadow-inner {
          box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.5);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        tbody tr {
          animation: fadeIn 0.3s ease forwards;
        }
      `}</style>
    </div>
  )
}