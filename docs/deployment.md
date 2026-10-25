# Развёртывание

Node >=22.18, проверен Node 24.14.0. Next.js 16.2.9 App Router, Node runtime. Пример рассчитан на расположение приложения в корне контейнера.

1. Установить пакет и создать runtime.config.ts.
2. Выполнить generate --code-only перед next build, либо закоммитить generated модули и проверять их актуальность в CI.
3. Подключить withRuntimeEnv, proxy.ts, RuntimeEnvScript и await connection() в layout.
4. Собрать output: standalone один раз. Перенести `.next/standalone`, `.next/static` в `.next/standalone/.next/static` и public при наличии в `.next/standalone/public`. При outputFileTracingRoot выше приложения путь server.js может быть вложенным: используйте фактическую структуру Next output.
5. Запускать `PORT=3000 HOSTNAME=0.0.0.0 node server.js` из standalone директории с runtime окружением контейнера.

Dockerfile рядом с примером выполняет все шаги. Для неопубликованного пакета сначала создайте tarball в корне библиотеки командой npm pack; Docker context — корень next-runtime-env. После публикации замените file dependency на версию registry.

```sh
docker build -f examples/next-app/Dockerfile -t next-runtime-env-example .
docker run --rm -p 3000:3000 --env-file examples/next-app/.env.staging next-runtime-env-example
```

`--env-file` здесь функция Docker, не Next.js и не CLI библиотеки. Для `.env.staging` нужен явный способ загрузки. Одного image достаточно; values не входят в TS и клиентский bundle. Серверные секреты передаются только процессу.

Reverse proxy/CDN: не кешировать `/__runtime-env` и динамический HTML; endpoint должен обходить аутентификацию и редиректы. Во всех репликах одного deployment держать одинаковую публичную конфигурацию. Переход пользователя на другое окружение требует reload документа. Не смешивайте HTML одного окружения и endpoint другого.

CSP требует nonce на RuntimeEnvScript и script-src, а fallback — connect-src 'self'. Если sync XHR запрещён, global-error без layout snapshot не сможет использовать синхронный API: будет RuntimeEnvBootstrapError. Не скрывайте эту ошибку.

Реальный standalone server проверяется browser тестами. Dockerfile предоставлен, запуск Docker engine отдельно отмечен в verification.md; тест standalone не равнозначен тесту Docker image.
