# React/Vite без Next.js

React19.2.7, Vite7.3.5. Библиотека имеет optional peer Next.js, здесь Next не устанавливается.

Из корня библиотеки выполните npm ci и npm pack. Затем в этой папке npm install и npm run generate; заполните созданный .env и выполните npm run dev. Classic public/runtime-env.js создаётся predev с явным --dotenv .env до запуска Vite. Все public getters видны таблицей. server.ts не импортируется.

Для production npm run build создаёт один dist. Перед запуском хостинга выполните APP_NAME=Production API_URL=https://api.example.com npm run bootstrap — он заменит только dist/runtime-env.js. Можно явно выбрать файл: npm run bootstrap -- --dotenv .env.production. Повторять vite build при смене runtime-значений не нужно. Настройте no-store на runtime-env.js и HTML; preview headers в vite.config.ts показывают локальный пример, не настраивают ваш CDN/nginx.

Пример использует один .env. В отличие от Next/Vite автоматических dotenv правил, CLI bootstrap загружает только process.env и явно указанный --dotenv файл; process.env имеет приоритет. Пустое KEY= остаётся пустым. Никогда не помещайте секреты в public. Результаты React18/19: ../../docs/react-results.json. Подробное подключение: ../../docs/react.md.
