import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { expect, it } from 'vitest'
import { App } from './App'

it.each([
  ['/catalog', 'Эстонский словарь'],
  ['/study', 'Тренировка'],
  ['/learned', 'Изученное'],
  ['/admin', 'Book Studio'],
])('renders %s inside the app shell', (path, heading) => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

  expect(html).toContain(`href="${path}"`)
  expect(html).toContain(`>${heading}</h1>`)
  expect(html).toContain('aria-current="page"')
})
