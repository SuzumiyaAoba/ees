import type { Meta, StoryObj } from '@storybook/react'
import { Heading, Text, Code, DisplayText } from './Typography'

// Heading Stories
const headingMeta = {
  title: 'Design System/Typography/Heading',
  component: Heading,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Heading>

export default headingMeta

type HeadingStory = StoryObj<typeof headingMeta>

export const AllHeadings: HeadingStory = {
  render: () => (
    <div className="space-y-6">
      <Heading level="h1">Heading 1 - The largest heading</Heading>
      <Heading level="h2">Heading 2 - Section titles</Heading>
      <Heading level="h3">Heading 3 - Subsection titles</Heading>
      <Heading level="h4">Heading 4 - Component titles</Heading>
      <Heading level="h5">Heading 5 - Small titles</Heading>
      <Heading level="h6">Heading 6 - The smallest heading</Heading>
    </div>
  ),
}

export const GradientHeadings: HeadingStory = {
  render: () => (
    <div className="space-y-6">
      <Heading level="h1" gradient>
        Gradient Heading 1
      </Heading>
      <Heading level="h2" gradient>
        Gradient Heading 2
      </Heading>
      <Heading level="h3" gradient>
        Gradient Heading 3
      </Heading>
    </div>
  ),
}

// Text Stories
const textMeta = {
  title: 'Design System/Typography/Text',
  component: Text,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Text>

export const AllTextVariants: StoryObj<typeof textMeta> = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <Text variant="lead">
        Lead text - This is used for important introductory paragraphs that need
        to stand out from the rest of the content.
      </Text>
      <Text variant="large">
        Large text - Slightly larger than body text for emphasis.
      </Text>
      <Text variant="body">
        Body text - The standard text size used for most content in the
        application. It provides good readability for longer passages of text.
      </Text>
      <Text variant="small">
        Small text - Used for less important information or supplementary
        details.
      </Text>
      <Text variant="muted">
        Muted text - Low emphasis text for secondary information.
      </Text>
      <Text variant="caption">
        Caption text - The smallest text size, typically used for labels and
        captions.
      </Text>
    </div>
  ),
}

export const TextWeights: StoryObj<typeof textMeta> = {
  render: () => (
    <div className="space-y-4">
      <Text weight="normal">Normal weight text</Text>
      <Text weight="medium">Medium weight text</Text>
      <Text weight="semibold">Semibold weight text</Text>
      <Text weight="bold">Bold weight text</Text>
    </div>
  ),
}

// Code Stories
const codeMeta = {
  title: 'Design System/Typography/Code',
  component: Code,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Code>

export const InlineCode: StoryObj<typeof codeMeta> = {
  render: () => (
    <Text>
      You can use the <Code>npm install</Code> command to install dependencies.
      The configuration is stored in <Code>package.json</Code> file.
    </Text>
  ),
}

export const CodeBlock: StoryObj<typeof codeMeta> = {
  render: () => (
    <Code inline={false}>
      {`import { EmbeddingService } from '@ees/core'

const service = new EmbeddingService()
const embedding = await service.createEmbedding({
  text: 'Sample text',
  model: 'nomic-embed-text'
})`}
    </Code>
  ),
}

// Display Text Stories
const displayMeta = {
  title: 'Design System/Typography/Display',
  component: DisplayText,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DisplayText>

export const DisplayWithGradient: StoryObj<typeof displayMeta> = {
  render: () => (
    <div className="space-y-8">
      <DisplayText>EES</DisplayText>
      <DisplayText>Embeddings</DisplayText>
    </div>
  ),
}

export const DisplayWithoutGradient: StoryObj<typeof displayMeta> = {
  render: () => <DisplayText gradient={false}>Plain Display</DisplayText>,
}

export const TypographyShowcase: HeadingStory = {
  render: () => (
    <div className="space-y-12 max-w-4xl">
      <section>
        <Heading level="h2" gradient className="mb-4">
          Typography System
        </Heading>
        <Text variant="lead">
          The EES design system provides a comprehensive typography scale for
          creating clear hierarchies and readable content.
        </Text>
      </section>

      <section>
        <Heading level="h3" className="mb-4">
          Headings
        </Heading>
        <div className="space-y-4">
          <Heading level="h1">H1 - Main page title</Heading>
          <Heading level="h2">H2 - Section heading</Heading>
          <Heading level="h3">H3 - Subsection heading</Heading>
          <Heading level="h4">H4 - Card or component title</Heading>
        </div>
      </section>

      <section>
        <Heading level="h3" className="mb-4">
          Body Text
        </Heading>
        <Text variant="lead" className="mb-4">
          Lead paragraph text provides emphasis for introductory content or key
          messages.
        </Text>
        <Text variant="body">
          Body text is the workhorse of your design. It should be comfortable to
          read in long passages. This design system uses system fonts for optimal
          rendering across different platforms while maintaining a clean,
          professional appearance.
        </Text>
      </section>

      <section>
        <Heading level="h3" className="mb-4">
          Code
        </Heading>
        <Text className="mb-2">
          Inline code like <Code>const value = true</Code> can be embedded in
          text.
        </Text>
        <Code inline={false}>
          {`// Code blocks for larger snippets
function createEmbedding(text: string) {
  return embedModel.encode(text)
}`}
        </Code>
      </section>
    </div>
  ),
}
