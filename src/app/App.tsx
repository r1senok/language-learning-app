import { Link, Navigate, Route, Routes } from 'react-router'
import { CatalogPage } from '../features/catalog/CatalogPage'
import { LearnedPage } from '../features/learned/LearnedPage'
import { StudyPage } from '../features/study/StudyPage'
import { StudyProvider } from '../features/study/StudyProvider'
import { AppShell } from '../ui/AppShell'

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="catalog-banner">
      <h1>{title}</h1>
      <p>{description}</p>
      <Link className="return-link" to="/catalog">← К словарю</Link>
    </section>
  )
}

export function App() {
  return (
    <StudyProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/catalog" replace />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="study" element={<StudyPage />} />
          <Route path="learned" element={<LearnedPage />} />
          <Route path="admin" element={<Placeholder title="Book Studio" description="Здесь появится редактор словаря и импорт данных." />} />
          <Route path="*" element={<Placeholder title="Страница не найдена" description="Проверьте адрес или вернитесь к словарю." />} />
        </Route>
      </Routes>
    </StudyProvider>
  )
}
