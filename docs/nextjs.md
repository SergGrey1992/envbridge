# Подключение Next.js 13–16

Единый пример подходит App Router на13.5.11+,14.2.35+,15.5.28+,16.2.9+ в соответствующих major-ветках. Точные проверенные версии — [compatibility.md](compatibility.md). Требуется Node.js>=22.18 и React, совместимый с выбранным Next.js.

| Ветка | Общая интеграция | Динамический layout | Next config |
|---|---|---|---|
| 13.5 /14.2 | Node Route Handler + RuntimeEnvScript | force-dynamic | next.config.mjs |
| 15.5 | То же | force-dynamic; connection() необязательная альтернатива | .mjs или .ts |
| 16 | То же; существующий Node proxy также поддерживается | force-dynamic; connection() необязательная альтернатива | .mjs или .ts |

## Подключение для всех версий

```ts
// app/%5F_runtime-env/route.ts
import { createRuntimeEnvHandler } from '@serggrey1992/envbridge/next';
import config from '../../runtime.config';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = createRuntimeEnvHandler(config);
export const HEAD = GET;
```

%5F обязателен: Next преобразует имя папки в URL /__runtime-env, а обычную __runtime-env исключает из routing как private folder. При src/app скорректируйте относительный импорт корневого конфига. Исключите endpoint из middleware авторизации, редиректов и кеширования CDN.

```tsx
// app/layout.tsx
import { RuntimeEnvScript } from '@serggrey1992/envbridge/next';
import config from '../runtime.config';
export const dynamic = 'force-dynamic';
export default function Layout({children}:{children:React.ReactNode}) {
  return <html><head><RuntimeEnvScript config={config}/></head><body>{children}</body></html>;
}
```

Библиотека не требует wrapper next.config. Для standalone достаточно export default {output:'standalone'} в next.config.mjs. На Next13/14 не переносите Node endpoint в Edge middleware: это другая среда выполнения. Bootstrap в layout обеспечивает начальную hydration; endpoint нужен для global-error без layout snapshot.

## Какой .env используется

| Команда / режим | Основной файл окружения |
|---|---|
| next dev / npm run dev | .env.development |
| next build / next start / standalone production | .env.production |
| NODE_ENV=test | .env.test |

Общий .env служит нижним уровнем. Для каждого ключа Next прекращает поиск на первом найденном значении:

1. process.env — значения процесса/контейнера.
2. .env.<NODE_ENV>.local.
3. .env.local (кроме test).
4. .env.<NODE_ENV>.
5. .env.

**KEY= является найденным пустым значением.** Например, API_URL= в .env.production перекрывает непустой API_URL в общем .env. Если хотите наследовать общий ключ, уберите его объявление из приоритетного файла; заполнение всех env-файлов не требуется. Generate по ТЗ добавляет отсутствующие ключи как пустые строки и не выбирает окружение за Next.js — учитывайте это при создании нескольких envFiles.

.env.staging и .env.testing не загружаются Next автоматически. Не задавайте NODE_ENV=staging; передайте нужные значения process env, docker --env-file или выбранным явным dotenv loader. .env.test — стандартное тестовое имя.

После изменения runtime значений перезапустите процесс и перезагрузите документ. Для getters библиотеки rebuild не нужен. Изменение исходного кода/списка ключей требует generate и обычной сборки.

## Standalone запуск

При output: standalone запускайте официальный server.js, а не next start. До запуска перенесите static assets:

```sh
npm run build
mkdir -p .next/standalone/.next/static
cp -R .next/static/. .next/standalone/.next/static/
# public, если есть, также переносится в .next/standalone/public
APP_NAME=Production API_URL=https://api.example.com node .next/standalone/server.js
```

Если хотите явно взять значения из корневого .env.production локально, Node>=22.18 позволяет загрузить его **до** server.js:

```sh
node --env-file=.env.production .next/standalone/server.js
```

Standalone меняет рабочий каталог: не рассчитывайте на автоматическое чтение исходного корневого .env из отдельного deployment. Передавайте значения процессу средствами среды запуска. Не включайте секретные .env в Docker image. При tracing root выше приложения путь server.js может быть вложенным — используйте фактическую структуру build output.

В этом репозитории основной example имеет output: standalone, а существующий npm start соответствует next start и выдаёт предупреждение Next.js. Для standalone используйте команды выше. Для локальной проверки с обычными .env и автообновлением исходников удобнее npm run dev.

## Проверка примера в репозитории

```sh
# корень библиотеки
npm ci
npm run prepare:example
cd examples/next-app
npm exec envbridge -- generate
npm run dev
```

Сгенерированные getters уже закоммичены; predev/prebuild обновляют локальный tarball и кеш, не меняя ваш .env. На главной публичные значения показаны таблицей, server getters выводятся в терминал напрямую через stdout по запросу пользователя. RootError/Missing/NotFound намеренно проверяют ошибки.

Список ограничений (Pages Router, Edge, static export, PPR/cacheComponents, basePath и прочее) и реальные browser/Docker результаты приведены в compatibility.md и verification.md.

Источники: [Next env](https://nextjs.org/docs/app/guides/environment-variables), [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
