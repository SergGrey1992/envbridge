# API

`/config`: `defineRuntimeConfig({public,server,output?,envFiles?})` проверяет только структуру и имена, возвращает неизменяемую конфигурацию. Никаких проверок значений.

`/client`: `getPublicEnv(key): string | undefined`, `RuntimeEnvNotInitializedError`, `RuntimeEnvBootstrapError`. Используйте сгенерированные env getters для строгого списка ключей. Low-level функция на сервере доверяет вызывающему коду; в браузере доступны только ключи публичного снимка. Импорт сам по себе не читает environment/window и не выполняет запросы.

`/server`: `getServerEnv(key): string | undefined`, защищён server-only и проверкой браузерного исполнения. Не экспортируйте его результат клиенту.

`/next`: `RuntimeEnvScript({config,nonce?})` — server-rendered bootstrap. `createRuntimeEnvProxy(config)` возвращает `(Request) => Response | undefined`; undefined означает другой путь. HEAD не имеет тела, GET возвращает JSON, прочие методы 405. `serializePublicEnv(config)` — безопасно экранированный JSON только allowlist, используется bootstrap/endpoint.

Generated env — объект с ленивыми accessors и точными именами из конфига. Каждый getter возвращает string | undefined; undefined в JSON транспортируется как null, затем восстанавливается. Пользователь не должен зависеть от внутренних window свойств.
