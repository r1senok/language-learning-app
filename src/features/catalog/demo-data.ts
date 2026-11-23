import type { Category, VocabularyEntry } from '../../domain/vocabulary/models'

export const categories: Category[] = [
  { id: 'everyday', name: 'Общение' },
  { id: 'food', name: 'Еда и напитки' },
  { id: 'home', name: 'Дом' },
  { id: 'nature', name: 'Природа' },
  { id: 'city', name: 'Город' },
]

const words: [id: string, lemma: string, translation: string, category: string, hints: string[]][] = [
  ['tere', 'tere', 'привет', 'everyday', ['👋']],
  ['aitah', 'aitäh', 'спасибо', 'everyday', ['🙏']],
  ['palun', 'palun', 'пожалуйста', 'everyday', ['🤲']],
  ['jah', 'jah', 'да', 'everyday', ['👍']],
  ['head-aega', 'head aega', 'до свидания', 'everyday', ['👋']],
  ['oun', 'õun', 'яблоко', 'food', ['🍎']],
  ['leib', 'leib', 'хлеб', 'food', ['🍞']],
  ['piim', 'piim', 'молоко', 'food', ['🥛']],
  ['kohv', 'kohv', 'кофе', 'food', ['☕']],
  ['vesi', 'vesi', 'вода', 'food', ['💧']],
  ['aken', 'aken', 'окно', 'home', ['🪟']],
  ['uks', 'uks', 'дверь', 'home', ['🚪']],
  ['tool', 'tool', 'стул', 'home', ['🪑']],
  ['voodi', 'voodi', 'кровать', 'home', ['🛏️']],
  ['voti', 'võti', 'ключ', 'home', ['🔑']],
  ['mets', 'mets', 'лес', 'nature', ['🌲', '🌳']],
  ['meri', 'meri', 'море', 'nature', ['🌊']],
  ['paike', 'päike', 'солнце', 'nature', ['☀️']],
  ['lumi', 'lumi', 'снег', 'nature', ['❄️']],
  ['lill', 'lill', 'цветок', 'nature', ['🌷']],
  ['buss', 'buss', 'автобус', 'city', ['🚌']],
  ['tanav', 'tänav', 'улица', 'city', ['🛣️']],
  ['pood', 'pood', 'магазин', 'city', ['🛒']],
  ['raamatukogu', 'raamatukogu', 'библиотека', 'city', ['📚']],
  ['park', 'park', 'парк', 'city', ['🌳', '🚶']],
]

export const demoVocabulary: VocabularyEntry[] = words.map(
  ([id, lemma, text, category, hintEmojis]) => ({
    id: `demo-${id}`,
    languageCode: 'et',
    lemma,
    translations: [{ languageCode: 'ru', text }],
    categoryIds: [category],
    hintEmojis,
    sources: [],
  }),
)
