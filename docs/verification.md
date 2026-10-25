# Результаты проверки — 24 октября 2026

## Окружение

macOS arm64, Node.js 24.14.0; Next.js 16.2.9, React 19.2.7, TypeScript strict. Браузер: установленный Chromium headless (Playwright, явный executable path). Docker Desktop engine 29.2.1; Linux arm64 image node:24-alpine, Node.js 24.22.1.

## Команды и результаты

| Проверка | Команда | Результат |
|---|---|---|
| Исходный рискованный прототип | build prototype + scripts/probe.mjs | PASS: runtime SSR, hydration, client/direct 404, root error без bootstrap |
| Формат | npm run format:check | PASS |
| Lint | npm run lint | PASS |
| Strict types | npm run typecheck | PASS |
| Unit + файловая и CLI интеграция | npm test | 46 PASS, 0 FAIL |
| ESM + declarations | npm run build | PASS |
| npm tarball | npm pack | PASS, файл в корне проекта |
| Независимый consumer | scripts/consumer.mjs | PASS: установка tarball, CLI generate, npm exec bin, strict generated types, CJS-загрузчик next.config |
| Production + standalone E2E | scripts/e2e.mjs | 4 PASS: A/B в каждом режиме |
| Build once / run twice | scripts/e2e.mjs | PASS: одна положительная сборка для всех четырёх запусков |
| Запрет server import в Client Component | отдельный отрицательный next build | PASS: сборка отклонена через server-only |
| Настоящий Docker image | Dockerfile + scripts/docker-e2e.mjs | 2 PASS: один image ID, разные runtime environment |
| Статический HTML | scripts/static-boundary.mjs | PASS: подтверждён build-time снимок как ограничение; runtime SSR требует динамического рендеринга |

Подробные машинные результаты: [e2e-results.json](e2e-results.json), [docker-results.json](docker-results.json).

## Что проверяют browser прогоны

Серверный HTML и серверный Route Handler получают runtime значения. Client Component видит те же значения, включая NEXT_PUBLIC_TEST, Unicode, кавычки, HTML-символы, переводы строк и `</script>`. Hydration подтверждена рабочим обработчиком события, ошибок hydration не обнаружено.

Проверены прямые и клиентские переходы на 404 и notFound(), segment error, reload ошибки, Retry, переход домой, клиентская ошибка root boundary, прямая ошибка root layout с полностью отсутствующим bootstrap в HTML, повторная загрузка global-error и восстановление. Проверен streaming через Suspense.

Секретный canary отсутствует в public endpoint, HTML и клиентских static assets. Реальный серверный getter подтверждён boolean результатом server-side проверки без отправки секрета в браузер. Для каждого окружения проверены public значения, отличающиеся от build-time; A/B различаются без rebuild. Отдельная отрицательная сборка после этих проверок не входит в положительный build-once эксперимент; положительный .next восстанавливается.

Docker image собран через предоставленный Dockerfile с установкой tarball в Linux. Одинаковый image ID использован для двух контейнеров. Проверены SSR, client hydration, NEXT_PUBLIC, server API, client-side 404, direct global-error без bootstrap, восстановление, исключение секретов из bootstrap. Оба тестовых контейнера остановлены; image сохранён локально.

## Проверки генератора и ревью

Сохранение существующих значений/пустых строк/комментариев/неизвестных ключей, кавычек, export, BOM, LF/CRLF, EOF без newline; multiline single/double/backtick; idempotence по bytes и mtime; malformed syntax и дубликаты; config validation; output escape, symlink и hardlink; точный generated marker; --cwd/--config/--env/modes/help; отсутствие config exception secrets в логах; rollback при реальной ошибке permissions, включая readonly generated файлы.

Независимое ревью выявило два дефекта генератора — readonly rollback и backtick parsing. Оба воспроизведены падающими regression tests и исправлены. Непроверенные режимы не заявляются поддерживаемыми.

## Ограничения

Синхронный XHR нужен только при отсутствии snapshot; блокирует поток, deprecated и может быть запрещён browser/Permissions Policy. CSP требует script nonce и connect-src self. Static export, basePath, multi-zones, экспериментальный PPR Next 14/15, Edge и Pages Router не поддерживаются MVP. Сам getter не делает статическую страницу динамической.

CI настроен для Node 22 и 24 на Ubuntu, но удалённые GitHub Actions в этой сессии не запускались. Локально проверены указанные выше macOS и Docker Linux версии. npm publish и GitHub release не выполнялись. Другие версии Next.js не заявлены.

## Решения по ТЗ

- Отдельный npm-проект размещён в envbridge/ внутри доступного workspace, исходная react-hook-form-persist не изменена.
- Интеграция использует только публичные API: proxy.ts и серверный RuntimeEnvScript в head. Обёртка next.config.ts удалена 25 октября 2026; настройки Next.js задаются напрямую.
- При невозможности inline bootstrap в global-error применён синхронный endpoint fallback; его ограничения явно документированы.
- Секреты никогда не генерируются в TS. public — единственный браузерный allowlist, а server entry дополнительно защищён server-only.
- Запись dotenv — append; многофайловый rollback рассчитан на обычные ошибки, не power loss, kill или параллельную злонамеренную смену путей.

## Упрощение интеграции — 25 октября 2026

Удалён withRuntimeEnv из API, примера и актуальной документации; тест wrapper удалён. Исходное ТЗ specification.md сохранено как исторический документ. Автоматическая проверка output: export удалена вместе с wrapper; static export по-прежнему не поддерживается, что явно указано в README.

После удаления: npm run check — PASS, 45 тестов (один тест удалён вместе с wrapper); свежий npm tarball установлен в consumer; 4 production/standalone A/B browser прогона и отрицательная server-only сборка — PASS.

## Next.js 13–16 — 25 октября 2026

Добавлен общий Node Route Handler createRuntimeEnvHandler. Основной пример использует app/runtime-env/route.ts, force-dynamic в layout и next.config.mjs; connection() и proxy для основного подключения не требуются. createRuntimeEnvProxy сохранён для существующих Next16 приложений. Расширены peers, добавлены React18 consumers и CI matrix.

Все 5 строк в compatibility.md прошли реальные проверки: strict generated types, CLI/npm exec,20 production/standalone A/B browser прогонов и5 server-only negative builds. Node24.14.0 локально; Node22 и24 настроены в CI. Диапазоны имеют минимальные patch-версии и не означают поддержку любого Next13.0+. Случаи вне матрицы явно ограничены.

Финальная проверка новой интеграции: npm run check —46 PASS,0 FAIL; npm run test:docker — новый image с Route Handler успешно проверен в двух окружениях, отчёт docker-results.json обновлён. Независимое ревью не обнаружило Important/Critical дефектов.

## Видимые значения в примере — 25 октября 2026

На главной добавлена подписанная таблица всех public getters с различимыми undefined и пустой строкой, а также SSR-чтение APP_NAME. По явному запросу пользователя значения server getters выводятся в stdout Next.js при рендере главной. Логирование находится только в примере, не в библиотеке.

В Next16 dev исходный вариант console.info пересылался в консоль браузера — это воспроизведено отдельным падающим browser тестом. Поэтому диагностика использует process.stdout.write и node:util.inspect. Сохранённый test:example-dev подтверждает присутствие обоих server canary в терминале и отсутствие в HTML/RSC и browser console. Проверка PASS.

Повторный npm run check:46 PASS, lint/typecheck/build/format PASS. Изолированный consumer Next16.2.9:4 production/standalone A/B прогона PASS с проверкой таблицы, обоих server logs, отсутствия значений в HTML/JS/browser console; server-only negative build PASS. Работающий пользовательский сервер и его .env не изменялись.

## Обновление локальной зависимости примера — 25 октября 2026

В реальном examples/next-app воспроизведён отсутствующий createRuntimeEnvHandler: установленный tarball содержал прежний dist/next.d.ts. После замены пакета TypeScript прошёл, но webpack повторно взял старый module snapshot. Добавлен prepare.mjs: npm pack актуальной библиотеки, установка через уникальный временный путь без изменения package.json/.env и сброс только .next/cache и tsconfig.tsbuildinfo. prebuild/predev запускают подготовку автоматически; root prepare:example доступен вручную. Проверка exports останавливает запуск с понятным сообщением при старом пакете вне source checkout.

Повторён именно npm run build пользовательского examples/next-app с автоматическим prebuild: компиляция, TypeScript, page data и standalone build PASS, без прежней ошибки или import warning. В CI добавлена подготовка локального примера; совместимые consumers копируют helper. Библиотечный API не менялся.

## React SPA и документация Next — 25 октября 2026

Пакет поддерживает React CSR без Next: optional Next peer, нейтральный /runtime, явный bootstrap CLI и пример Vite7.3.5. Реальная установка tarball в независимые React18.2.0 и19.2.7 consumers не установила Next.js (проверен npm dependency tree). Для каждого: strict types, dev и одна production build с A/B runtime bootstrap, первый getter до первого render, navigation/reload/error recovery, no-store и secret scan PASS. Hash-файлы приложения и HTML не менялись между окружениями. Машинный отчёт: react-results.json.

После выделения общего ядра повторно прошли все5 строк Next13–16:20 production/standalone A/B browser runs и5 server-only negative builds. Unit/CLI/bootstrap проверки:56 PASS. Исходный обязательный Next API сохранён. Независимое read-only ревью не обнаружило Critical/Important дефектов.

Новые docs/nextjs.md и docs/react.md разделяют способы подключения, env file selection, process.env precedence, пустые overrides, development/production/test, static bootstrap и standalone. Пользовательские .env и .idea не изменялись. Обычный React SSR/React Native/прочие bundlers отдельно не заявлены.

## Переименование в EnvBridge — 25 октября 2026

npm name @serggrey1992/envbridge, bin envbridge, tarball serggrey1992-envbridge-0.1.0.tgz, GitHub SergGrey1992/envbridge и локальная папка /Users/sergdia/Documents/ChatGPT/envbridge. Все импорты, оба примера, CLI, generated headers, Docker image и активные инструкции обновлены. Историческое specification.md сохранено с notice. Старые generated headers распознаются строго и мигрируют без ручного удаления.

После переименования:58 unit/CLI тестов PASS; Next13–16 matrix20 browser runs +5negative builds PASS; React18/19 no-Next dev/production A/B PASS с новым tarball; Docker envbridge-example:local A/B PASS. Пользовательский Next example обновлён на новое имя пакета и успешно пересобран; .env и .idea не изменялись. Независимое read-only ревью не выявило Important/Critical дефектов. GitHub repo переименован с сохранением истории, origin обновлён на новый SSH URL.

## Cache Components / partial prefetching

`examples/next-cache-components` использует Next 16.4.3 и оба флага. После
`npm pack` в корне и `npm install` внутри примера запустите из корня
`npm run test:cache-components`. При необходимости задайте
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Проверка собирает приложение с build-time
canary, затем запускает одну сборку дважды с разными runtime env и проверяет
браузерные значения, hydration, переход по Link, no-store обоих endpoint и
отсутствие приватного canary в HTML/публичном bootstrap. Это отдельная проверка
обычного Node production server; Docker/standalone и global-error этого нового
примера пока не входят в неё.
