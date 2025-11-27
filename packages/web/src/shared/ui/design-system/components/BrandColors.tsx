import React from 'react'
import { colors } from '../tokens'

interface ColorSwatchProps {
  name: string
  value: string
  description?: string
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ name, value, description }) => {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-24 rounded-lg shadow-md border border-border"
        style={{ backgroundColor: value }}
      />
      <div>
        <p className="font-semibold text-sm">{name}</p>
        <p className="text-xs text-muted-foreground font-mono">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  )
}

/**
 * BrandColors Component
 *
 * Displays the EES brand color palette with descriptions
 */
export const BrandColors: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Brand Colors */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Brand Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ColorSwatch
            name="Primary"
            value={colors.brand.primary}
            description="Indigo - Represents AI/ML and intelligence"
          />
          <ColorSwatch
            name="Secondary"
            value={colors.brand.secondary}
            description="Cyan - Represents data and connectivity"
          />
          <ColorSwatch
            name="Accent"
            value={colors.brand.accent}
            description="Purple - Represents innovation"
          />
        </div>
      </section>

      {/* Semantic Colors */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Semantic Colors</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <ColorSwatch
            name="Success"
            value={colors.semantic.success}
            description="Positive actions and states"
          />
          <ColorSwatch
            name="Warning"
            value={colors.semantic.warning}
            description="Caution and attention"
          />
          <ColorSwatch
            name="Error"
            value={colors.semantic.error}
            description="Errors and destructive actions"
          />
          <ColorSwatch
            name="Info"
            value={colors.semantic.info}
            description="Informational messages"
          />
        </div>
      </section>

      {/* Neutral Colors */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Neutral Colors</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ColorSwatch name="50" value={colors.neutral[50]} />
          <ColorSwatch name="100" value={colors.neutral[100]} />
          <ColorSwatch name="200" value={colors.neutral[200]} />
          <ColorSwatch name="300" value={colors.neutral[300]} />
          <ColorSwatch name="400" value={colors.neutral[400]} />
          <ColorSwatch name="500" value={colors.neutral[500]} />
          <ColorSwatch name="600" value={colors.neutral[600]} />
          <ColorSwatch name="700" value={colors.neutral[700]} />
          <ColorSwatch name="800" value={colors.neutral[800]} />
          <ColorSwatch name="900" value={colors.neutral[900]} />
        </div>
      </section>
    </div>
  )
}
