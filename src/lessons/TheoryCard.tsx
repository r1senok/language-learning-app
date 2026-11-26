import { AudioPhrase } from './AudioPhrase'
import type { BilingualExample, TheoryPanel, TheoryText } from './readerContent'

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

export function TheoryCard({ panel }: { panel: TheoryPanel }) {
  if (panel.kind === 'highlight') return <div className="reader-theory-highlight">
    {panel.panels.map((child, index) => <TheoryCard key={index} panel={child} />)}
  </div>
  if (panel.kind === 'paragraph') return <p className="reader-theory-paragraph"><InlineTheory text={panel.text} /></p>
  if (panel.kind === 'heading') return <div className="reader-theory-heading">
    {panel.label && <p className="lesson-accent-heading">{panel.label}</p>}
    <h2 lang="et">{panel.title}</h2>
    <p className="reader-theory-heading__subtitle">{panel.subtitle}</p>
  </div>
  if (panel.kind === 'table') return <table className="reader-table">
    {panel.title && <caption>{panel.title}</caption>}
    <thead><tr>{panel.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
    <tbody>{panel.rows.map((row, rowIndex) => <tr key={rowIndex}>
      {row.map((value, index) => <td key={index} lang={(panel.estonianColumns?.includes(index) ?? index < 2) ? 'et' : undefined}>
        {index === panel.accent ? <strong className="reader-accent"><InlineTheory text={value} /></strong> : <InlineTheory text={value} />}
      </td>)}
    </tr>)}</tbody>
  </table>
  if (panel.kind === 'example-group') return <ul className="reader-example-group">
    {panel.items.map((item, index) => <li key={index}><Example item={item} /></li>)}
  </ul>
  if (panel.kind === 'dialogue-group') return <div className="reader-dialogue-group">
    {panel.dialogues.map((dialogue, index) => <ol key={index} className="reader-dialogue">
      {dialogue.map((item, line) => <li key={line}><Example item={item} /></li>)}
    </ol>)}
  </div>
  return <div className="reader-phrases">
    {panel.items.map(({ et, ru }) => <AudioPhrase key={et} et={et} ru={ru} />)}
  </div>
}
