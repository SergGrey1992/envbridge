# Обычный React без Next.js

Поддерживается клиентский React SPA; проверены React18.2.0 и19.2.7 с Vite7.3.5. Next.js — optional peer и в этих consumers не установлен. Node.js>=22.18 нужен для CLI/генерации bootstrap, но не для исполнения статического сайта в браузере.

Тот же пакет, тот же runtime.config.ts, тот же сгенерированный env из runtime-env/client. React Provider, Context и hooks для чтения env не нужны. Не используйте import.meta.env.VITE_* как замену: Vite подставляет такие значения во время build.

## 1. Конфиг и getters

```ts
// runtime.config.ts
import { defineRuntimeConfig } from '@serggrey1992/envbridge/config';
export default defineRuntimeConfig({
  public: ['API_URL', 'APP_NAME'],
  server: [],
});
```

```sh
npm install @serggrey1992/envbridge
npx envbridge generate
```

Для локальной разработки библиотеки можно установить tarball из npm pack. Generate создаёт имена/getters и пустые .env-шаблоны. Он не копирует значения в TS. Сгенерированный server.ts предназначен для Next Server Components и в SPA не импортируется. В обычном React нет серверных компонентов; секреты должны оставаться в вашем backend.

## 2. Bootstrap до запуска приложения

```sh
npx envbridge bootstrap --dotenv .env
```

По умолчанию создаётся public/runtime-env.js с фактическими значениями **только public**. Этот файл намеренно содержит публичные данные: не коммитьте сгенерированные значения. Команда читает process.env; --dotenv явно добавляет один файл, уже заданные process env имеют приоритет. Автоматического выбора .env.development/.env.production/Vite mode здесь нет.

```html
<!-- index.html: classic script, без async/defer, перед module entry -->
<script src="/runtime-env.js"></script>
<script type="module" src="/src/main.tsx"></script>
```

Vite отдаёт public файл как есть и копирует его в dist. Classic script выполняется до module entry, поэтому getters синхронны уже при первом чтении. Не помещайте script после модуля и не добавляйте async/defer. При другом host/base path подключите правильный URL файла. В Vite ссылки на public assets обрабатываются с учётом его base; произвольные SSR frameworks здесь не заявлены.

```tsx
import { env } from './runtime-env/client';
export function App() { return <h1>{env.APP_NAME}</h1>; }
```

Пример с таблицей, navigation/error boundary и отличимыми undefined/пустой строкой: [examples/react-vite](../examples/react-vite).

## 3. Одна сборка, разные окружения

```sh
npm run build
# При запуске/развёртывании после build:
APP_NAME=Staging API_URL=https://staging.example.com \
  npx envbridge bootstrap --output ./dist/runtime-env.js
# Тот же dist для другого окружения, без повторного vite build:
APP_NAME=Production API_URL=https://api.example.com \
  npx envbridge bootstrap --output ./dist/runtime-env.js
```

Можно передать --dotenv .env.staging явно. Vite preview, nginx или static host обслуживает готовый dist. Выполняйте bootstrap до открытия сайта посетителям и до запуска web server, либо атомарно заменяйте файл как часть deployment. Укажите **Cache-Control: no-store** для runtime-env.js и HTML, исключите их из service worker/CDN cache. Сама CLI-команда не может настроить ваш web server. Hash-файлы приложения при этом не изменяются.

Для чистого nginx image: выполните CLI в builder/entrypoint с установленным Node, затем передайте файл static host. Сам браузер и nginx не могут прочитать environment контейнера и не выполняют Node CLI. Сетевой config server или собственный Docker runtime библиотека не добавляет.

## Node host как альтернатива файлу

`/runtime` не импортирует Next.js или React. Если у приложения есть Node backend, он может отдавать `createRuntimeEnvScript(config)` как application/javascript с no-store, либо использовать `createRuntimeEnvHandler(config)` для JSON endpoint. Инициализация браузера всё равно должна завершиться до первого чтения getter. Не импортируйте runtime.config.ts с server-ключами в клиентский bundle.

## Диагностика и ограничения

- Пустая строка остаётся пустой строкой; отсутствующее значение даёт undefined.
- Новый bootstrap не меняет уже открытый документ: нужен reload. Навигация/error boundary используют исходный snapshot.
- При отсутствующем snapshot общий клиент пытается резервный /runtime-env endpoint. В статическом SPA такого endpoint обычно нет: вы получите RuntimeEnvBootstrapError. Загрузите runtime-env.js до приложения; не скрывайте ошибку как undefined.
- CSP должен разрешать внешний script. Инъекционные символы и script terminators экранируются; в транспорте undefined обозначается null.
- React CSR проверен, React SSR/RSC вне Next, CRA/Webpack и другие bundlers отдельно не тестировались. Универсальный client getter не привязан к Vite, но это не обещание тестирования каждого инструмента.

Проверки: npm run test:react; результаты react-results.json. Проверяются установка tarball без Next, strict types, dev, production A/B из одной сборки, первое синхронное чтение до React render, навигация, reload, error recovery, секреты и неизменность hashed assets.
