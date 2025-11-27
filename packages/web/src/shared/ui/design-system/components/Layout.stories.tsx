import type { Meta, StoryObj } from '@storybook/react'
import { Container, Section, Grid, Stack, Divider } from './Layout'
import { Card } from '@/components/ui/Card'

// Container Stories
const containerMeta = {
  title: 'Design System/Layout/Container',
  component: Container,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Container>

export default containerMeta

export const AllContainerSizes: StoryObj<typeof containerMeta> = {
  render: () => (
    <div className="space-y-4 p-4">
      <Container size="sm" className="bg-muted/50 py-4">
        <p className="text-center">Small Container (max-w-screen-sm)</p>
      </Container>
      <Container size="md" className="bg-muted/50 py-4">
        <p className="text-center">Medium Container (max-w-screen-md)</p>
      </Container>
      <Container size="lg" className="bg-muted/50 py-4">
        <p className="text-center">Large Container (max-w-screen-lg)</p>
      </Container>
      <Container size="xl" className="bg-muted/50 py-4">
        <p className="text-center">Extra Large Container (max-w-screen-xl)</p>
      </Container>
      <Container size="2xl" className="bg-muted/50 py-4">
        <p className="text-center">2XL Container (max-w-screen-2xl)</p>
      </Container>
    </div>
  ),
}

// Section Stories
const sectionMeta = {
  title: 'Design System/Layout/Section',
  component: Section,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Section>

export const AllSectionVariants: StoryObj<typeof sectionMeta> = {
  render: () => (
    <div>
      <Section variant="default">
        <Container>
          <h3 className="text-2xl font-bold">Default Section</h3>
          <p className="mt-2">Regular section with no background</p>
        </Container>
      </Section>
      <Section variant="muted">
        <Container>
          <h3 className="text-2xl font-bold">Muted Section</h3>
          <p className="mt-2">Subtle background for visual separation</p>
        </Container>
      </Section>
      <Section variant="accent">
        <Container>
          <h3 className="text-2xl font-bold">Accent Section</h3>
          <p className="mt-2">Gradient background for featured content</p>
        </Container>
      </Section>
    </div>
  ),
}

// Grid Stories
const gridMeta = {
  title: 'Design System/Layout/Grid',
  component: Grid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Grid>

export const GridExamples: StoryObj<typeof gridMeta> = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">2 Columns</h3>
        <Grid cols={2}>
          <Card className="p-4">Item 1</Card>
          <Card className="p-4">Item 2</Card>
          <Card className="p-4">Item 3</Card>
          <Card className="p-4">Item 4</Card>
        </Grid>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">3 Columns</h3>
        <Grid cols={3}>
          <Card className="p-4">Item 1</Card>
          <Card className="p-4">Item 2</Card>
          <Card className="p-4">Item 3</Card>
          <Card className="p-4">Item 4</Card>
          <Card className="p-4">Item 5</Card>
          <Card className="p-4">Item 6</Card>
        </Grid>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">4 Columns</h3>
        <Grid cols={4}>
          <Card className="p-4">Item 1</Card>
          <Card className="p-4">Item 2</Card>
          <Card className="p-4">Item 3</Card>
          <Card className="p-4">Item 4</Card>
        </Grid>
      </div>
    </div>
  ),
}

// Stack Stories
const stackMeta = {
  title: 'Design System/Layout/Stack',
  component: Stack,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Stack>

export const StackExamples: StoryObj<typeof stackMeta> = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Vertical Stack</h3>
        <Stack direction="vertical" gap="md">
          <Card className="p-4">Item 1</Card>
          <Card className="p-4">Item 2</Card>
          <Card className="p-4">Item 3</Card>
        </Stack>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Horizontal Stack</h3>
        <Stack direction="horizontal" gap="md">
          <Card className="p-4">Item 1</Card>
          <Card className="p-4">Item 2</Card>
          <Card className="p-4">Item 3</Card>
        </Stack>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Centered Stack</h3>
        <Stack direction="horizontal" gap="md" align="center" justify="center">
          <Card className="p-4">Centered</Card>
          <Card className="p-4 h-20">Different Heights</Card>
          <Card className="p-4">Aligned Center</Card>
        </Stack>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Space Between</h3>
        <Stack direction="horizontal" gap="none" justify="between">
          <Card className="p-4">Start</Card>
          <Card className="p-4">Middle</Card>
          <Card className="p-4">End</Card>
        </Stack>
      </div>
    </div>
  ),
}

// Divider Stories
const dividerMeta = {
  title: 'Design System/Layout/Divider',
  component: Divider,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Divider>

export const DividerExamples: StoryObj<typeof dividerMeta> = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Horizontal Divider</h3>
        <p>Content above</p>
        <Divider />
        <p>Content below</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Vertical Divider</h3>
        <div className="flex items-center h-20">
          <p>Left content</p>
          <Divider orientation="vertical" />
          <p>Right content</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Different Spacing</h3>
        <p>Content</p>
        <Divider spacing="sm" />
        <p>Small spacing</p>
        <Divider spacing="md" />
        <p>Medium spacing</p>
        <Divider spacing="lg" />
        <p>Large spacing</p>
      </div>
    </div>
  ),
}

// Combined Layout Example
export const CompleteLayoutExample: StoryObj<typeof containerMeta> = {
  render: () => (
    <div>
      <Section variant="accent" spacing="lg">
        <Container>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            EES Design System
          </h1>
          <p className="text-xl text-muted-foreground">
            A comprehensive layout system for building consistent interfaces
          </p>
        </Container>
      </Section>

      <Section spacing="lg">
        <Container>
          <h2 className="text-3xl font-bold mb-6">Features</h2>
          <Grid cols={3} gap="lg">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">Responsive</h3>
              <p className="text-muted-foreground">
                Mobile-first design that adapts to all screen sizes
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">Flexible</h3>
              <p className="text-muted-foreground">
                Customizable variants for different use cases
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">Consistent</h3>
              <p className="text-muted-foreground">
                Unified spacing and sizing throughout
              </p>
            </Card>
          </Grid>
        </Container>
      </Section>

      <Section variant="muted" spacing="lg">
        <Container>
          <Stack direction="vertical" gap="lg">
            <h2 className="text-3xl font-bold">Stack Example</h2>
            <Stack direction="horizontal" gap="md" justify="between">
              <Card className="p-4 flex-1">Card 1</Card>
              <Card className="p-4 flex-1">Card 2</Card>
              <Card className="p-4 flex-1">Card 3</Card>
            </Stack>
          </Stack>
        </Container>
      </Section>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
}
