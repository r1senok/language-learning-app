import { AudioPhrase } from './AudioPhrase'
import type { BilingualExample, TheoryPanel } from './readerContent'

function Example({ item: { before, accent, after, ru } }: { item: BilingualExample }) {
  return <>
    <p lang="et">{before}<strong className="reader-accent">{accent}</strong>{after}</p>
    <p>{ru}</p>
  </>
}

export function TheoryCard({ panel }: { panel: TheoryPanel }) {
  if (panel.kind === 'tip') return <aside className="reader-tip">{panel.text}</aside>
  if (panel.kind === 'table') return <table className="reader-table">
    {panel.title && <caption>{panel.title}</caption>}
    <thead><tr>{panel.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
    <tbody>{panel.rows.map((row) => <tr key={row[0]}>
      {row.map((value, index) => <td key={index} lang={(panel.estonianColumns?.includes(index) ?? index < 2) ? 'et' : undefined}>
        {index === panel.accent ? <strong className="reader-accent">{value}</strong> : value}
      </td>)}
    </tr>)}</tbody>
  </table>
  if (panel.kind === 'explanation') return <section className="reader-explanation">
    <h2 lang="et">{panel.title}</h2>
    <p className="reader-explanation__subtitle">{panel.subtitle}</p>
    {panel.paragraphs.map((text, index) => <p key={index}>{text}</p>)}
  </section>
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
