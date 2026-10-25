# API

`/config`: `defineRuntimeConfig({public,server,output?,envFiles?})` проверяет только структуру и имена, возвращает неизменяемую конфигурацию. Никаких проверок значений.

`/client`: `getPublicEnv(key): string | undefined`, `RuntimeEnvNotInitializedError`, `RuntimeEnvBootstrapError`. Используйте сгенерированные env getters для строгого списка ключей. Low-level функция на сервере доверяет вызывающему коду; в браузере доступны только ключи публичного снимка. Импорт сам по себе не читает environment/window и не выполняет запросы.

`/server`: `getServerEnv(key): string | undefined`, защищён server-only и проверкой браузерного исполнения. Не экспортируйте его результат клиенту.

`/next`: `RuntimeEnvScript({config,nonce?})` — server-rendered bootstrap. `createRuntimeEnvHandler(config)` возвращает `(Request) => Response` для Node Route Handler на Next.js 13–16. Сам handler не включает dynamic rendering: файл route.ts должен экспортировать `runtime = 'nodejs'` и `dynamic = 'force-dynamic'`. `createRuntimeEnvProxy(config)` — сохранённый адаптер для Node proxy Next.js 16, возвращает `(Request) => Response | undefined`; undefined означает другой путь. HEAD не имеет тела, GET возвращает JSON, прочие методы 405. `serializePublicEnv(config)` — безопасно экранированный JSON только allowlist, используется bootstrap/endpoint.

Generated env — объект с ленивыми accessors и точными именами из конфига. Каждый getter возвращает string | undefined; undefined в JSON транспортируется как null, затем восстанавливается. Пользователь не должен зависеть от внутренних window свойств.

`/runtime` — framework-neutral Node API без импорта Next или React: `serializePublicEnv(config)`, `createRuntimeEnvScript(config): string` и `createRuntimeEnvHandler(config)`. Script содержит только public snapshot и экранируется для JS/HTML. В браузере создание script/сериализация запрещены runtime guard.

CLI `bootstrap [--cwd] [--config] [--dotenv file] [--output file.js]` создаёт public/runtime-env.js по умолчанию. В отличие от generate, bootstrap пишет фактические public значения; серверные значения не сериализуются. --dotenv загружает один файл явно, process.env имеет приоритет. --output/--dotenv не применяются к generate; --env/--code-only/--env-only не применяются к bootstrap. Пути считаются от --cwd. Bootstrap требует собственного generated marker, запрещает symlink/hardlink/выход за корень без allow-outside-root, устанавливает файл атомарно и сохраняет idempotence.
