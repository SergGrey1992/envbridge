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

Синхронный XHR нужен только при отсутствии snapshot; блокирует поток, deprecated и может быть запрещён browser/Permissions Policy. CSP требует script nonce и connect-src self. Static export, basePath, multi-zones, PPR/cacheComponents, Edge и Pages Router не поддерживаются MVP. Сам getter не делает статическую страницу динамической.

CI настроен для Node 22 и 24 на Ubuntu, но удалённые GitHub Actions в этой сессии не запускались. Локально проверены указанные выше macOS и Docker Linux версии. npm publish и GitHub release не выполнялись. Другие версии Next.js не заявлены.

## Решения по ТЗ

- Отдельный npm-проект размещён в next-runtime-env/ внутри доступного workspace, исходная react-hook-form-persist не изменена.
- Интеграция использует только публичные API: proxy.ts и серверный RuntimeEnvScript в head. Обёртка next.config.ts удалена 25 октября 2026; настройки Next.js задаются напрямую.
- При невозможности inline bootstrap в global-error применён синхронный endpoint fallback; его ограничения явно документированы.
- Секреты никогда не генерируются в TS. public — единственный браузерный allowlist, а server entry дополнительно защищён server-only.
- Запись dotenv — append; многофайловый rollback рассчитан на обычные ошибки, не power loss, kill или параллельную злонамеренную смену путей.

## Упрощение интеграции — 25 октября 2026

Удалён withRuntimeEnv из API, примера и актуальной документации; тест wrapper удалён. Исходное ТЗ specification.md сохранено как исторический документ. Автоматическая проверка output: export удалена вместе с wrapper; static export по-прежнему не поддерживается, что явно указано в README.

После удаления: npm run check — PASS, 45 тестов (один тест удалён вместе с wrapper); свежий npm tarball установлен в consumer; 4 production/standalone A/B browser прогона и отрицательная server-only сборка — PASS.

## Next.js 13–16 — 25 октября 2026

Добавлен общий Node Route Handler createRuntimeEnvHandler. Основной пример использует app/%5F_runtime-env/route.ts, force-dynamic в layout и next.config.mjs; connection() и proxy для основного подключения не требуются. createRuntimeEnvProxy сохранён для существующих Next16 приложений. Расширены peers, добавлены React18 consumers и CI matrix.

Все 5 строк в compatibility.md прошли реальные проверки: strict generated types, CLI/npm exec,20 production/standalone A/B browser прогонов и5 server-only negative builds. Node24.14.0 локально; Node22 и24 настроены в CI. Диапазоны имеют минимальные patch-версии и не означают поддержку любого Next13.0+. Случаи вне матрицы явно ограничены.

Финальная проверка новой интеграции: npm run check —46 PASS,0 FAIL; npm run test:docker — новый image с Route Handler успешно проверен в двух окружениях, отчёт docker-results.json обновлён. Независимое ревью не обнаружило Important/Critical дефектов.
