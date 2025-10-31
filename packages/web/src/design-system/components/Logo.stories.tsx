import type { Meta, StoryObj } from '@storybook/react'
import { Logo } from './Logo'

const meta = {
  title: 'Design System/Brand/Logo',
  component: Logo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Size of the logo',
    },
    variant: {
      control: 'select',
      options: ['default', 'gradient', 'white'],
      description: 'Visual variant of the logo',
    },
  },
} satisfies Meta<typeof Logo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    size: 'md',
    variant: 'default',
  },
}

export const Gradient: Story = {
  args: {
    size: 'md',
    variant: 'gradient',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    variant: 'default',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    variant: 'default',
  },
}

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    variant: 'gradient',
  },
}

export const OnDarkBackground: Story = {
  args: {
    size: 'lg',
    variant: 'white',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Small</p>
        <Logo size="sm" variant="gradient" />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Medium</p>
        <Logo size="md" variant="gradient" />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Large</p>
        <Logo size="lg" variant="gradient" />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Extra Large</p>
        <Logo size="xl" variant="gradient" />
      </div>
    </div>
  ),
}
