import type { Meta, StoryObj } from '@storybook/react'
import { BrandColors } from './BrandColors'

const meta = {
  title: 'Design System/Brand/Colors',
  component: BrandColors,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BrandColors>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
