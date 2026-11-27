import type { ReactNode } from 'react'
import { AudioPhrase } from './AudioPhrase'
import type { BilingualExample, DialogueLine, TheoryPanel, TheoryText } from './readerContent'

function Example({ item: { before, accent, after, ru } }: { item: BilingualExample }) {
  return <>
    <p lang="et">{before}<strong className="reader-accent">{accent}</strong>{after}</p>
    <p>{ru}</p>
  </>
}

function InlineTheory({ text }: { text: TheoryText }) {
  if (typeof text === 'string') return text
  return text.map(({ text, emphasis, lang }, index) => emphasis
    ? <strong key={index} lang={lang} className={emphasis === 'form' ? 'reader-accent' : undefined}>{text}</strong>
    : <span key={index} lang={lang}>{text}</span>)
}

function TheoryTable(panel: Omit<Extract<TheoryPanel, { kind: 'table' }>, 'kind'>) {
  const table = <table className="reader-table" data-roomy={panel.roomy || undefined}>
    {panel.title && <caption>{panel.title}</caption>}
    {panel.headers?.length ? <thead><tr>{panel.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead> : null}
    <tbody>{panel.rows.map((row, rowIndex) => <tr key={rowIndex}>
      {row.map((value, index) => <td key={index} lang={(panel.estonianColumns?.includes(index) ?? index < 2) ? 'et' : undefined}>
        {index === panel.accent ? <strong className="reader-accent"><InlineTheory text={value} /></strong> : <InlineTheory text={value} />}
      </td>)}
    </tr>)}</tbody>
  </table>
  return panel.scrollable
    ? <div className="reader-table-scroll" role="region" aria-label={panel.title ?? 'Таблица'} tabIndex={0}>{table}</div>
    : table
}

function DialogueGroup({ dialogues, onPlayAudio }: {
  dialogues: DialogueLine[][]; onPlayAudio?: (src: string) => void
}) {
  return <div className="reader-dialogue-group">
    {dialogues.map((dialogue, index) => <ol key={index} className="reader-dialogue">
      {dialogue.map(({ before, accent, after, ru, side, audioSrc }, line) => <li key={line} data-side={side}>
        <AudioPhrase et={before + accent + after} ru={ru} side={side}
          onPlayAudio={audioSrc && onPlayAudio ? () => onPlayAudio(audioSrc) : undefined} />
      </li>)}
    </ol>)}
  </div>
}

export function ContentGroup({ children, tone, padding = 'default', edgeToEdge }: {
  children: ReactNode; tone?: 'theory'; padding?: 'none' | 'compact' | 'default'; edgeToEdge?: boolean
}) {
  return <div className="reader-content-group" data-tone={tone} data-padding={padding}
    data-edge-to-edge={edgeToEdge || undefined}>{children}</div>
}

export function TheoryCard({ panel, onPlayDialogueAudio }: { panel: TheoryPanel; onPlayDialogueAudio?: (src: string) => void }) {
  if (panel.kind === 'content-group') return <ContentGroup tone={panel.tone} padding={panel.padding} edgeToEdge={panel.edgeToEdge}>
    {panel.panels.map((child, index) => <TheoryCard key={index} panel={child} onPlayDialogueAudio={onPlayDialogueAudio} />)}
  </ContentGroup>
  if (panel.kind === 'paragraph') return <p className="reader-theory-paragraph"><InlineTheory text={panel.text} /></p>
  if (panel.kind === 'note') return <aside className="reader-theory-paragraph"><InlineTheory text={panel.text} /></aside>
  if (panel.kind === 'heading') return <div className="reader-theory-heading">
    {panel.label && <p className="lesson-accent-heading">{panel.label}</p>}
    <h2 lang="et">{panel.title}</h2>
    {panel.subtitle && <p className="reader-theory-heading__subtitle">{panel.subtitle}</p>}
  </div>
  if (panel.kind === 'table') return <TheoryTable {...panel} />
  if (panel.kind === 'example') return <div className="reader-example-group"><Example item={panel.item} /></div>
  if (panel.kind === 'example-group' && panel.tableHeaders) return <TheoryTable headers={panel.tableHeaders}
    estonianColumns={[0]} rows={panel.items.map(({ before, accent, after, ru }) =>
      [[{ text: before }, { text: accent, emphasis: 'form' }, { text: after }], ru])} />
  if (panel.kind === 'example-group') return <ul className="reader-example-group">
    {panel.items.map((item, index) => <li key={index}><Example item={item} /></li>)}
  </ul>
  if (panel.kind === 'dialogue-group') return <DialogueGroup dialogues={panel.dialogues} onPlayAudio={onPlayDialogueAudio} />
  return <div className="reader-phrases">
    {panel.items.map(({ et, ru }) => <AudioPhrase key={et} et={et} ru={ru} />)}
  </div>
}
