import fs from 'fs'
import path from 'path'
import Link from 'next/link'

export default async function ArchitecturePage() {
  const filePath = path.join(process.cwd(), 'docs', 'architecture.md')
  const markdown = fs.readFileSync(filePath, 'utf8')
  
  // Simple markdown to HTML conversion
  const html = markdown
    .split('\n')
    .map(line => {
      // H1
      if (line.startsWith('# ')) {
        return `<h1 class="text-5xl font-medium mb-8 mt-12 first:mt-0">${line.slice(2)}</h1>`
      }
      // H2
      if (line.startsWith('## ')) {
        return `<h2 class="text-3xl font-medium mb-6 mt-12">${line.slice(3)}</h2>`
      }
      // H3
      if (line.startsWith('### ')) {
        return `<h3 class="text-2xl font-medium mb-4 mt-8">${line.slice(4)}</h3>`
      }
      // Code blocks
      if (line.startsWith('```')) {
        return line === '```' ? '</code></pre>' : '<pre class="bg-surface border border-border rounded-lg p-4 overflow-x-auto my-4"><code>'
      }
      // Inline code
      if (line.includes('`')) {
        line = line.replace(/`([^`]+)`/g, '<code class="bg-surface px-2 py-1 rounded text-accent text-sm">$1</code>')
      }
      // Bold
      if (line.includes('**')) {
        line = line.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-text">$1</strong>')
      }
      // Links
      if (line.includes('[')) {
        line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent hover:underline">$1</a>')
      }
      // List items
      if (line.startsWith('- ')) {
        return `<li class="ml-6 mb-2">${line.slice(2)}</li>`
      }
      // Horizontal rule
      if (line === '---') {
        return '<hr class="border-border my-8">'
      }
      // Paragraph
      if (line.trim() === '') {
        return '<br>'
      }
      return `<p class="mb-4 leading-relaxed text-muted2">${line}</p>`
    })
    .join('\n')

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 border-b border-border bg-bg/95 backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-medium hover:text-accent transition-colors">
            ← headless<span className="text-accent">-</span>markets
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/docs/architecture" className="text-accent">
              Docs
            </Link>
            <a 
              href="https://github.com/iono-such-things/nullpriest" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted2 hover:text-text transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-6 py-16">
        <div 
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-muted text-sm">
        <p>built by <a href="https://nullpriest.xyz" className="text-accent hover:underline">nullpriest</a></p>
      </footer>
    </div>
  )
}