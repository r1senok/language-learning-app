export function AudioPhrase({ et, ru, onPlayAudio }: {
  et: string; ru: string; onPlayAudio?: (text: string) => void
}) {
  return <article className="reader-phrase">
    <div className="reader-phrase__body">
      <h3 lang="et">
        <button className="reader-phrase__audio" type="button" disabled={!onPlayAudio}
          aria-label={onPlayAudio ? `Прослушать: ${et}` : undefined}
          onClick={() => onPlayAudio?.(et)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M3 9h4l5-4v14l-5-4H3z" />
            <path d="M15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{et}</span>
        </button>
        {!onPlayAudio && <span lang="ru" className="sr-only"> Озвучка недоступна</span>}
      </h3>
      <p>{ru}</p>
    </div>
  </article>
}
