import MarkdownIt from 'markdown-it'
import frontMatter from 'markdown-it-front-matter'
import { load as parseYaml } from 'js-yaml'
import { bundledLanguages, createHighlighter, type Highlighter } from 'shiki'

let highlighterInstance: Highlighter | null = null

/**
 * Initialize the syntax highlighter
 * This is called once and cached for reuse
 */
async function getHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) {
    return highlighterInstance
  }

  highlighterInstance = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: Object.keys(bundledLanguages),
  })

  return highlighterInstance
}

/**
 * Render markdown content to HTML with syntax highlighting
 * @param content - Markdown content to render
 * @returns Rendered HTML string
 */
export async function renderMarkdown(content: string): Promise<string> {
  const highlighter = await getHighlighter()

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: (code, lang) => {
      try {
        // Check if language is supported
        const loadedLanguages = highlighter.getLoadedLanguages()
        const language = loadedLanguages.includes(lang as never) ? lang : 'text'

        return highlighter.codeToHtml(code, {
          lang: language,
          themes: {
            light: 'github-light',
            dark: 'github-dark',
          },
        })
      } catch (error) {
        console.error('Failed to highlight code:', error)
        return `<pre><code>${code}</code></pre>`
      }
    },
  })

  // Parse front matter if present
  let frontMatterData: Record<string, unknown> | null = null
  md.use(frontMatter, (fm: string) => {
    try {
      const parsed = parseYaml(fm)
      if (parsed && typeof parsed === 'object') {
        frontMatterData = parsed as Record<string, unknown>
      }
    } catch (error) {
      console.error('Failed to parse front matter:', error)
    }
  })

  const renderedHtml = md.render(content)

  // If front matter exists, prepend it as a table
  if (frontMatterData && Object.keys(frontMatterData).length > 0) {
    const frontMatterTable = `
      <div class="mb-4 border rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <tbody>
            ${Object.entries(frontMatterData)
              .map(
                ([key, value]) => `
              <tr class="border-b last:border-b-0">
                <td class="py-2 px-3 bg-muted/50 font-medium w-1/4 align-top">
                  ${key}
                </td>
                <td class="py-2 px-3 break-words">
                  ${formatValue(value)}
                </td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
    return frontMatterTable + renderedHtml
  }

  return renderedHtml
}

/**
 * Format front matter values for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

/**
 * Check if content is markdown
 */
export function isMarkdownContent(text: string, convertedFormat?: string): boolean {
  return (
    convertedFormat === 'markdown' ||
    text.includes('```') ||
    text.includes('#') ||
    text.includes('**') ||
    text.includes('*') ||
    text.includes('[') ||
    text.includes(']')
  )
}
