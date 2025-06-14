'use client'

import { usePageTracking } from '@/hooks/usePageTracking'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Types for the calculator data
interface Recipe {
  [key: string]: number
}

interface ItemData {
  [category: string]: {
    [itemName: string]: {
      HQ?: Recipe
      'Non-HQ'?: Recipe
    }
  }
}

interface ComponentRecipes {
  [componentName: string]: Recipe
}

// Component recipes data
const componentRecipes: ComponentRecipes = {
  'Ammo': { 'Iron Ingot': 1, 'Charcoal': 1 },
  'Attachment Part': { 'Copper Ingot': 2, 'Silver Ingot': 1 },
  'Cloth': { 'Fabric': 1, 'Polyester': 1 },
  'Component': { 'Iron Ingot': 1, 'Copper Ingot': 1 },
  'Engine Part': { 'Iron Ingot': 1, 'Copper Ingot': 1, 'Petrol': 1 },
  'Interior Part': { 'Fabric': 2, 'Polyester': 2 },
  'Iron Plate': { 'Iron Ingot': 1, 'Fabric': 1, 'Polyester': 1 },
  'Kevlar': { 'Iron Plate': 1, 'Iron Ingot': 20 },
  'Mechanical Component': { 'Iron Ingot': 2, 'Copper Ingot': 2 },
  'Rotor': { 'Charcoal': 1, 'Polyester': 1 },
  'Stabilizer': { 'Iron Ingot': 2, 'Gold Ingot': 1 },
  'Tempered Glass': { 'Glass': 2, 'Polyester': 1 },
  'Weapon Part': { 'Iron Ingot': 1, 'Copper Ingot': 1 },
  'Ammo (HQ)': { 'Ammo': 3, 'Petrol': 1 },
  'Attachment Part (HQ)': { 'Attachment Part': 3, 'Wooden Plank': 15 },
  'Component (HQ)': { 'Component': 2, 'Gold Ingot': 15 },
  'Engine Part (HQ)': { 'Engine Part': 9, 'Copper Ingot': 45, 'Petrol': 45 },
  'Interior Part (HQ)': { 'Interior Part': 9, 'Wooden Plank': 45 },
  'Mechanical Component (HQ)': { 'Mechanical Component': 9, 'Gold Ingot': 45 },
  'Rotor (HQ)': { 'Rotor': 9, 'Silver Ingot': 30 },
  'Stabilizer (HQ)': { 'Stabilizer': 3, 'Polyester': 15 },
  'Weapon Part (HQ)': { 'Weapon Part': 3, 'Iron Ingot': 15, 'Copper Ingot': 16 },
  'Special Rotor': { 'Special Rotor': 1 },
  'Special Gun Barrel': { 'Special Gun Barrel': 1 }
}

// Raw material prices
const rawMaterialPrices: { [key: string]: number } = {
  'Glass': 2000,
  'Copper Ingot': 2200,
  'Iron Ingot': 2600,
  'Silver Ingot': 2800,
  'Gold Ingot': 3000,
  'Wooden Plank': 2800,
  'Firewood': 2800,
  'Charcoal': 2800,
  'Fabric': 3500,
  'Polyester': 3500,
  'Petrol': 4250,
  'Special Rotor': 20000000,
  'Special Gun Barrel': 2500000
}

// Sample item data (you can expand this)
const itemData: ItemData = {
  'Weapons': {
    'AK-74': {
      'HQ': { 'Weapon Part (HQ)': 2, 'Stabilizer (HQ)': 2, 'Attachment Part (HQ)': 2 }
    },
    'M16A2': {
      'Non-HQ': { 'Weapon Part': 27, 'Stabilizer': 15, 'Attachment Part': 17 }
    }
  },
  'Vehicles': {
    'M151A2 Off-Road': {
      'Non-HQ': { 'Mechanical Component': 1, 'Engine Part': 1 }
    }
  }
}

export default function CalculatorPage() {
  usePageTracking()
  const { hasAccess, loading } = useAuth()

  const [selectedCategory, setSelectedCategory] = useState<string>('--')
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [result, setResult] = useState<any>(null)
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false)

  // Redirect if no access
  useEffect(() => {
    if (!loading && !hasAccess) {
      window.location.href = '/'
    }
  }, [hasAccess, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  const calculateComponentCost = (name: string, qty: number = 1): number => {
    const price = rawMaterialPrices[name]
    if (price) return price * qty
    
    if (componentRecipes[name]) {
      return Object.entries(componentRecipes[name]).reduce((sum, [sub, count]) => {
        return sum + calculateComponentCost(sub, count * qty)
      }, 0)
    }
    return 0
  }

  const breakdownResources = (components: Recipe): { [key: string]: number } => {
    const flat: { [key: string]: number } = {}
    
    const recurse = (name: string, qty: number) => {
      if (rawMaterialPrices[name]) {
        flat[name] = (flat[name] || 0) + qty
      } else if (componentRecipes[name]) {
        for (const [sub, count] of Object.entries(componentRecipes[name])) {
          recurse(sub, count * qty)
        }
      }
    }
    
    for (const [comp, qty] of Object.entries(components)) {
      recurse(comp, qty)
    }
    return flat
  }

  const calculateCost = () => {
    if (!selectedItem || !selectedCategory || selectedCategory === '--') {
      setResult({ error: 'Please select a category and item' })
      return
    }

    const categoryData = itemData[selectedCategory]
    if (!categoryData || !categoryData[selectedItem]) {
      setResult({ error: 'Item not found' })
      return
    }

    const itemRecipe = categoryData[selectedItem]
    const variant = itemRecipe.HQ || itemRecipe['Non-HQ']
    
    if (!variant) {
      setResult({ error: 'No recipe found for this item' })
      return
    }

    let baseCost = 0
    for (const [comp, qty] of Object.entries(variant)) {
      baseCost += calculateComponentCost(comp, qty)
    }
    baseCost *= quantity

    const rawBreakdown = breakdownResources(variant)
    
    setResult({
      itemName: selectedItem,
      quantity,
      baseCost,
      breakdown: rawBreakdown,
      variant: itemRecipe.HQ ? 'HQ' : 'Non-HQ'
    })
  }

  const getAvailableItems = () => {
    if (selectedCategory === '--' || !itemData[selectedCategory]) {
      return []
    }
    return Object.keys(itemData[selectedCategory])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary-500 mb-4">
              Crafting Calculator
              <span className="ml-3 text-sm bg-yellow-500 text-black px-2 py-1 rounded">Updated!</span>
            </h1>
            <p className="text-white/70 text-lg">
              Calculate material costs and resource requirements for crafting items
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calculator Form */}
            <Card>
              <CardHeader>
                <CardTitle>Item Calculator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Select Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value)
                      setSelectedItem('')
                      setResult(null)
                    }}
                    className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  >
                    <option value="--">--</option>
                    {Object.keys(itemData).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Item Selection */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Select Item
                  </label>
                  <select
                    value={selectedItem}
                    onChange={(e) => {
                      setSelectedItem(e.target.value)
                      setResult(null)
                    }}
                    disabled={selectedCategory === '--'}
                    className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Choose an item...</option>
                    {getAvailableItems().map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <Button onClick={calculateCost} className="w-full">
                  Calculate Materials
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                {result ? (
                  result.error ? (
                    <div className="text-red-400 text-center py-8">
                      {result.error}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-2">
                          {result.quantity} × {result.itemName}
                        </h3>
                        <p className="text-sm text-white/70">
                          {result.variant} Recipe
                        </p>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary-500">
                            ${result.baseCost.toLocaleString()}
                          </div>
                          <div className="text-sm text-white/70">Total Cost</div>
                        </div>
                      </div>

                      {result.breakdown && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-white">Raw Materials</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowBreakdown(!showBreakdown)}
                            >
                              {showBreakdown ? 'Hide' : 'Show'} Breakdown
                            </Button>
                          </div>
                          
                          {showBreakdown && (
                            <div className="space-y-2">
                              {Object.entries(result.breakdown).map(([material, qty]) => {
                                const price = rawMaterialPrices[material] || 0
                                const totalCost = price * (qty as number) * result.quantity
                                return (
                                  <div key={material} className="flex justify-between items-center py-2 border-b border-white/10">
                                    <span className="text-white/90">
                                      {(qty as number) * result.quantity} × {material}
                                    </span>
                                    <span className="text-primary-500 font-medium">
                                      ${totalCost.toLocaleString()}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="text-white/50 text-center py-8">
                    Select an item and calculate to see results
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-white/50">
            <p>Made with ❤️ by Levy | ELAN: v.0.7.18</p>
          </div>
        </div>
      </div>
    </div>
  )
}