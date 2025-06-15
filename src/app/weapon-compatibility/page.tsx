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
  // ... rest of the component code ...

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0]">
      {/* ... rest of the JSX ... */}
    </div>
  )
}