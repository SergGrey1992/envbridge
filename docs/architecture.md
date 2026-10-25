# Архитектура

Отдельный ESM npm-проект. Значения всегда string | undefined, getters ленивые.

## Решение и альтернативы

Один layout bootstrap ненадёжен: global-error заменяет layout. Единственный асинхронный endpoint несовместим с синхронными getters. Инъекция в private Next chunks исключена.

Выбран снимок публичного allowlist в inline script серверного RuntimeEnvScript в head. Это простой script, выполняемый HTML-парсером до hydration. Сервер читает process.env[key] динамически; браузер читает неизменяемый снимок. Никаких значений в generated TS.

Дополнительный публичный integration point: proxy.ts с createRuntimeEnvProxy(config). Он обслуживает /__runtime-env без кеширования. В global-error при отсутствии snapshot getter один раз синхронно загружает JSON с этого endpoint. Это осознанный компромисс: sync XHR блокирует поток, deprecated браузерами и требует connect-src 'self'. Ошибка загрузки диагностируется исключением, никогда не undefined. Пользователь без этого ограничения должен использовать асинхронный UI API, который выходит за согласованное ТЗ.

Обёртка next.config.ts не требуется. Обязательные точки интеграции: proxy.ts и RuntimeEnvScript в root head. Нет mutations внутренних файлов, instrumentation и webpack plugins.

Root layout вызывает await connection() перед рендером snapshot. Страницы, читающие runtime значения, должны быть динамическими. Статический HTML и output: export не поддерживают runtime SSR. Отдельные server/client запросы читают один process environment; изменение process.env во время запроса не поддерживается. Клиентский snapshot живёт до reload; для другого окружения перезагрузить документ.

## Безопасность

Только config.public сериализуется. Секреты не читаются для bootstrap. Экранируются < > & U+2028 U+2029; undefined кодируется null и восстанавливается как undefined. server entry импортирует server-only и дополнительно проверяет window. Клиентский entry не импортирует config. Low-level getPublicEnv на сервере читает переданный ключ: это API доверенного серверного кода, generated client ограничивает ключи типами. Браузер получает только allowlist.

CSP: RuntimeEnvScript принимает nonce; начальный inline script требует соответствующий script-src. Резервный запрос requires connect-src 'self'. Endpoint должен обходить auth redirects и CDN cache. basePath и multi-zones в MVP не поддерживаются.

## Публичные источники

- https://nextjs.org/docs/app/guides/environment-variables
- https://nextjs.org/docs/app/api-reference/functions/connection
- https://nextjs.org/docs/app/api-reference/file-conventions/error
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://nextjs.org/docs/app/api-reference/config/next-config-js/output

Матрица фактически выполненных проверок хранится в verification.md; наличие теста не считается его прохождением.
