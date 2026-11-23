import { Link, NavLink, Outlet } from 'react-router'

const links = [
  { to: '/catalog', label: 'Словарь' },
  { to: '/study', label: 'Тренировка' },
  { to: '/learned', label: 'Изученное' },
  { to: '/admin', label: 'Book Studio' },
]

export function AppShell() {
  return (
    <>
      <header className="site-header">
        <div className="page-width header-inner">
          <Link to="/catalog" className="brand">
            <span className="brand-mark" aria-hidden="true">Õ</span>
            Sõnavara
          </Link>
          <nav className="site-nav" aria-label="Основная навигация">
            {links.map(({ to, label }) => (
              <NavLink key={to} to={to} className="nav-link">{label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="page-width py-8 sm:py-12">
        <Outlet />
      </main>
    </>
  )
}
