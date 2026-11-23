# Sõnavara

Мобильный тренажёр эстонских слов с русскими переводами. В каталоге 25 демонстрационных записей, составленных для локальной разработки.

## Локальный запуск

Используйте Node.js 24 и npm.

```bash
npm ci
npm run dev
```

Vite выведет адрес приложения. Корневой маршрут перенаправляет в `/catalog`. Добавьте слова в каталоге, откройте `/study` для тренировки или `/learned` для просмотра выученных слов. Маршрут `/admin` содержит заглушку. Для запуска нужны только зависимости из lock-файла. Фабрика клиента Supabase находится в `src/infrastructure/supabase/client.ts` и подключается вызывающим кодом с явной конфигурацией.

## Тренировка

Смахните карточку вправо, если знаете слово, или влево, если хотите его повторить. Можно воспользоваться кнопками или стрелками клавиатуры, когда фокус находится в области тренировки. Чтобы слово стало выученным, ответьте «Знаю» в обоих направлениях. Подсказка и просмотр ответа влияют только на отображение карточки.

Очередь и прогресс сохраняются в IndexedDB для текущего адреса приложения и профиля браузера.

## Проверки

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

Production-сборка записывается в `dist/`. Команда `preview` запускает её локально.

## Структура

- `src/app` содержит маршруты и стили приложения.
- `src/ui` содержит общую адаптивную оболочку.
- `src/domain` содержит модели словаря, импорта и прогресса.
- `src/features/catalog` содержит каталог, его фильтры и демонстрационные записи.
- `src/features/study` и `src/features/learned` содержат интерфейс тренировки и список выученных слов.
- `src/infrastructure/indexed-db` содержит реализацию локального репозитория прогресса.
- `src/infrastructure/supabase` содержит фабрику клиента для будущего подключения.

## Тестовый деплой на Cloudflare Pages

Создайте отдельный проект **Pages** на бесплатном тарифе и привяжите его к ветке `staging`. В настройках Pages эта ветка называется **Production branch**. Она будет обслуживать постоянный адрес именно тестового проекта.

1. В рабочей копии, где есть изменения приложения, создайте ветку и отправьте её в GitHub. Перед коммитом проверьте список файлов. В коммит должны войти исходники, конфигурация, `package-lock.json` и `public/_headers`.

   ```bash
   git switch -c staging
   git add .gitignore .node-version README.md index.html package.json package-lock.json public src tsconfig.json vite.config.ts
   git diff --cached --stat
   git commit -m "Prepare vocabulary trainer for staging"
   git push -u origin staging
   ```

2. В Cloudflare Dashboard откройте **Workers & Pages → Create application → Pages → Connect to Git**. Подключите GitHub и предоставьте приложению Cloudflare доступ к `r1senok/language-learning-app`. Выберите этот репозиторий.
3. В **Set up builds and deployments** укажите параметры:

   | Поле | Значение |
   | --- | --- |
   | Project name | Уникальное имя с суффиксом `-staging` |
   | Production branch | `staging` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | Оставить пустым, чтобы использовать корень репозитория |
   | Environment variables | Оставить пустыми. Версия Node.js задана в `.node-version` |

4. Нажмите **Save and Deploy**. После успешной сборки скопируйте основной HTTPS-адрес `pages.dev`, который показывает Cloudflare для проекта. Следующие пуши в `staging` будут обновлять приложение по этому адресу. При желании отключите сборки остальных веток в **Settings → Builds & deployments → Branch control**.
5. Откройте адрес в браузере на Mac и в Safari на iPhone. Проверьте прямое открытие и обновление `/catalog`, `/study` и `/learned`, затем добавьте слово, ответьте на карточку и обновите страницу. Очередь и прогресс сохраняются отдельно в каждом браузере для этого адреса. Локальный прогресс с другого адреса туда не переносится.

Cloudflare Pages обслуживает прямые переходы по маршрутам React Router через встроенный SPA fallback. Сохраните отсутствие `dist/404.html`, чтобы fallback продолжал работать. Vite копирует файл `public/_headers` в `dist`; заголовок `X-Robots-Tag: noindex` просит поисковики не индексировать тестовый сайт. Ссылка открыта для всех, у кого она есть. Манифест PWA и service worker пока отсутствуют.

Справка Cloudflare: [интеграция с GitHub](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/), [SPA fallback](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering), [версия Node.js](https://developers.cloudflare.com/pages/configuration/build-image/).
