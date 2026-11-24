import type { Exercise } from './engine'

export const lessonId = 'tere-a1-01'
export const lessons: (readonly [string, string] | undefined)[] = [
  ['Hakkame pihta!', 'Начнём!'],
  ['Palun ja aitäh!', 'Пожалуйста и спасибо!'],
  ['Kas te räägite eesti keelt?', 'Вы говорите по-эстонски?'],
  ['Minu nimi on…', 'Меня зовут…'],
  ...Array.from({ length: 16 }, () => undefined),
]

function choice(id: string, prompt: string, options: string[], correct: number, explanation: string,
  kind: 'multiple_choice' | 'fill_blank' | 'listening_choice' = 'multiple_choice', audio?: string): Exercise {
  return { id, prompt, options: options.map((text, i) => ({ id: String(i), text })), correct: String(correct), explanation, kind, audio }
}

function order(id: string, prompt: string, words: string[], order: string[], explanation: string): Exercise {
  return { id, prompt, options: words.map((text) => ({ id: text, text })), order, explanation, kind: 'word_order' }
}

export const blocks: { title: string; exercises: Exercise[] }[] = [
  {
    title: 'Приветствия и прощания',
    exercises: [
      choice('greeting-meaning', 'Что означает «Kohtumiseni!»?', ['Добрый вечер!', 'До встречи!', 'Спокойной ночи!'], 1, 'Kohtumiseni! говорят, когда прощаются до следующей встречи.'),
      { ...choice('greeting-morning', 'Как поздороваться с соседом утром?', ['Head aega!', 'Tere õhtust!', 'Tere hommikust!'], 2, 'Hommik — утро, поэтому здесь подходит Tere hommikust!'), scene: { icon: '🌅', label: 'Утро' } },
      { ...choice('greeting-reply', 'Коллега уходит и говорит «Nägemist!». Что ответить?', ['Head aega!', 'Tere päevast!', 'Tervist!'], 0, 'Head aega! тоже выражает прощание.'), scene: { icon: '👋', label: 'Коллега прощается' } },
      choice('greeting-listen', 'Послушай и выбери услышанную фразу.', ['Head ööd!', 'Tere õhtust!', 'Tere päevast!'], 1, 'Ты слышишь Tere õhtust! — «Добрый вечер!»', 'listening_choice', 'Tere õhtust!'),
    ],
  },
  {
    title: 'Личные местоимения',
    exercises: [
      { id: 'pronoun-pairs', kind: 'matching_pairs', prompt: 'Соедини краткие формы с полными.', explanation: 'Me — meie, ta — tema, nad — nemad.',
        pairs: [{ id: 'me', left: 'me', right: 'meie' }, { id: 'ta', left: 'ta', right: 'tema' }, { id: 'nad', left: 'nad', right: 'nemad' }] },
      choice('pronoun-meaning', 'Что означает «teie»?', ['Мы', 'Они', 'Вы'], 2, 'Teie и te означают «вы».'),
      choice('pronoun-blank', 'Заполни краткой формой «я»: „… olen siin.“', ['Ma', 'Sa', 'Ta'], 0, 'Ma — краткая форма mina.', 'fill_blank'),
      choice('pronoun-pair', 'Какая полная форма соответствует «sa»?', ['Tema', 'Sina', 'Meie'], 1, 'Sina и sa — формы местоимения «ты».'),
    ],
  },
  {
    title: 'Глагол olema',
    exercises: [
      choice('olema-blank', 'Подставь форму: „Me … kodus.“', ['olete', 'oleme', 'on'], 1, 'С me («мы») употребляется oleme.', 'fill_blank'),
      choice('olema-agreement', 'Выбери грамматически правильное предложение.', ['Sa oled siin.', 'Sa olen siin.', 'Sa on siin.'], 0, 'Местоимение sa требует oled.'),
      order('olema-build', 'Собери «Вы в школе».', ['koolis', 'olete', 'Te'], ['Te', 'olete', 'koolis'], 'Te olete koolis: te — вы, olete — форма olema, koolis — в школе.'),
      choice('olema-translate', 'Как сказать «Они дома»?', ['Me oleme kodus.', 'Ta on kodus.', 'Nad on kodus.'], 2, 'Nad означает «они». С ним употребляется on.'),
    ],
  },
  {
    title: 'Отрицание с ei ole и pole',
    exercises: [
      order('negative-build', 'Сделай „Sa oled siin“ отрицательным с ei ole.', ['siin', 'ole', 'Sa', 'ei'], ['Sa', 'ei', 'ole', 'siin'], 'Sa ei ole siin — «Ты не здесь».'),
      choice('negative-choice', 'Как записать «Мы не дома» с pole?', ['Me pole kodus.', 'Me ei oleme kodus.', 'Me poleme kodus.'], 0, 'Pole не меняется с me.'),
      choice('negative-blank', 'Заполни пропуск: „Ta ei … koolis.“', ['oled', 'ole', 'on'], 1, 'В отрицании используется ei ole.', 'fill_blank'),
      choice('negative-review', 'Как сказать «Они не в школе»?', ['Nad on koolis.', 'Ta ei ole koolis.', 'Nad pole koolis.'], 2, 'Nad — «они», pole — отрицание глагола olema.'),
    ],
  },
]
export const exercises = blocks.flatMap((block) => block.exercises)
