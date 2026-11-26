export function Icon({ name }: { name: 'back' | 'book' | 'cards' | 'check' | 'search' | 'plus' | 'close' | 'bulb' | 'eye' | 'undo' | 'library' | 'profile' | 'lock' | 'cloud' }) {
  const paths = {
    back: <path d="M18 12H6m6-6-6 6 6 6" />,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" /></>,
    cards: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 8h6M9 12h4" /><path d="M3 7v10a3 3 0 0 0 3 3" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.7 2.7L16.5 9" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></>,
    plus: <path d="M12 5v14M5 12h14" />, close: <path d="m6 6 12 12M18 6 6 18" />,
    bulb: <><path d="M9 18h6M10 21h4" /><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5c-1 .7-1.5 1.5-1.5 2.5h-4c0-1-.5-1.8-1.5-2.5z" /></>,
    eye: <><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5z" /><circle cx="12" cy="12" r="2.5" /></>,
    undo: <><path d="M9 7 4 12l5 5" /><path d="M5 12h8a6 6 0 0 1 6 6" /></>,
    library: <><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" /><path d="M7 16h12M9 8h6M9 11h4" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    cloud: <path d="M7 18h10a4 4 0 0 0 .8-7.9A6 6 0 0 0 6.4 9 4.5 4.5 0 0 0 7 18z" />,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}
