# Совместимость Next.js 13–16

Проверено 25 октября 2026 на macOS arm64, Node.js 24.14.0, Chromium. Все consumers установили реальный npm tarball без `--force` и `--legacy-peer-deps`.

| Next.js | React | Strict types / CLI | Production A/B | Standalone A/B | server-only negative build |
|---|---|---|---|---|---|
| 13.5.11 | 18.2.0 | PASS | PASS / PASS | PASS / PASS | PASS |
| 14.2.35 | 18.3.1 | PASS | PASS / PASS | PASS / PASS | PASS |
| 15.5.28 | 19.2.7 | PASS | PASS / PASS | PASS / PASS | PASS |
| 16.2.9 | 19.2.7 | PASS | PASS / PASS | PASS / PASS | PASS |
| 16.4.3 | 19.2.7 | PASS | PASS / PASS | PASS / PASS | PASS |

Для каждой строки одна положительная production build, затем четыре запуска без rebuild с различным runtime environment. Отдельная отрицательная сборка подтверждает ошибку при импорте server API в Client Component. Проверены SSR и гидратация, NEXT_PUBLIC без inlining, действительно отсутствующие значения, переходы на неизвестный URL и notFound(), reload ошибок, segment error / Retry, client root error, прямой global-error без bootstrap, recovery, streaming и отсутствие secret-canary в HTML/JS/endpoint. В тестовом example отключён Link prefetch, чтобы заранее загруженные ответы не влияли на проверки изменяющихся cookie/error состояний старого роутера.

Машинные отчёты: [13.5.11](compatibility/next-13.5.11.json), [14.2.35](compatibility/next-14.2.35.json), [15.5.28](compatibility/next-15.5.28.json), [16.2.9](compatibility/next-16.2.9.json), [16.4.3](compatibility/next-16.4.3.json).

## Подключение одинаково для всех строк

1. Конфиг runtime.config.ts и next-runtime-env generate.
2. Node Route Handler в app/%5F_runtime-env/route.ts: runtime = 'nodejs', dynamic = 'force-dynamic', GET = createRuntimeEnvHandler(config), HEAD = GET.
3. RuntimeEnvScript в head root layout и dynamic = 'force-dynamic' в layout.

Префикс %5F обязателен: обычная папка __runtime-env считается private. Итоговый URL — /__runtime-env. Handler должен обходить middleware авторизации и CDN cache. Настройка NextConfig не требует обёртки; next.config.mjs совместим со старыми Next.js. connection() на Next13/14 не нужен.

Существующее подключение createRuntimeEnvProxy остаётся рабочим на Node proxy Next16. Для Next13/14 **не используйте Edge middleware** как замену Node endpoint: это другая среда исполнения с другими правилами env. Для унифицированного подключения замените proxy.ts на описанный route.ts.

## Диапазоны и ограничения

Peers: `next: ^13.5.11 || ^14.2.35 || ^15.5.28 || ^16.2.9`, `react: ^18.2.0 || ^19.0.0`. Фактически пройденные версии указаны в таблице; совместимые patch/minor обновления внутри этих диапазонов допускаются semver, но каждое будущее обновление не считается уже протестированным. При новых версиях обновляйте matrix и прогоняйте тесты. Сочетание React должно также удовлетворять peerDependencies самого Next.js.

Это не обещание поддержки любого Next.js начиная с 13.0: 13.0–13.4,14.0–14.1,15.0–15.4 и patch-версии ниже указанных floors не входят в заявленный диапазон. App Router и Node runtime обязательны. Node>=22.18 — требование библиотеки, даже если сам старый Next допускает Node16/18.

Pages Router, Edge, basePath/multi-zones, static export и cacheComponents/PPR остаются вне поддержки. Статический HTML с runtime getter сохраняет build-time значение: требуется динамический рендеринг. Sync XHR fallback в global-error имеет прежние ограничения CSP и browser policy. Совместимость с React18 не устраняет эти ограничения.

## Воспроизведение

```sh
npm ci
npx playwright install chromium
npm run test:compat
# только одна версия
NRE_NEXT_VERSION=13.5.11 npm run test:compat
```

Consumers создаются в игнорируемом .compat/ и изолированы от установленной в корне Next16. Порты3191–3194 используются последовательно. Для установленного браузера задайте PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. NRE_OFFLINE=1 допустим только при заранее заполненном npm cache.

GitHub Actions содержит матрицу всех строк на Node22 и24. Локальный результат не означает, что удалённый workflow уже прошёл: смотрите реальные GitHub checks после push.
