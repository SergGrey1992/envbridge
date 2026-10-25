# Next.js 16 Cache Components

Отдельное подключение для `cacheComponents: true`, без изменения API EnvBridge.
`partialPrefetching: true` включён для Next 16.4.3. На 16.2.9 удалите только этот параметр.

Из корня репозитория выполните `npm pack`, затем в этой папке `npm install`,
`cp .env.example .env.local` и `npm run dev`.
Для production: `npm run build`, затем `APP_NAME=Production API_URL=https://api.example.com npm start`.

Корневой layout остаётся статическим. Обычный внешний script в head загружает
публичный snapshot из Node Route Handler до hydration. Endpoint вызывает
`connection()` и запрещает кеширование. Не заменяйте его на `async`/`defer` script.
JSON endpoint нужен для fallback, в том числе global-error без корневого layout.

Чтение env при SSR находится после `await connection()` и под `Suspense`.
Любой Client Component, читающий getters при SSR, также должен находиться внутри
такой динамической границы. Не читайте runtime env в статической оболочке,
`use cache` или на уровне модуля. Не добавляйте `dynamic = 'force-dynamic'`.
Пример требует Node runtime, deployment в корне URL и доступ к обоим endpoint
без авторизации и CDN-кеша. При CSP разрешите внешний same-origin script.

Для Next 13/14 и обычного Next 15/16 смотрите соседний `next-app` и
[таблицу подключений](../../docs/nextjs.md).
