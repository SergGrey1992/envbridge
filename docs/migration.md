# Переименование в EnvBridge

Пакет: `@serggrey1992/envbridge`. CLI: `envbridge`. Репозиторий: https://github.com/SergGrey1992/envbridge. Локальная папка проекта — envbridge.

Прежнее имя — @serggrey1992/next-runtime-env, прежняя CLI-команда — next-runtime-env. Установка из npm: npm install @serggrey1992/envbridge. Для локальной разработки используйте tarball serggrey1992-envbridge-0.1.0.tgz из npm pack.

## Обновление существующего приложения

1. Обновить зависимость и импорты в runtime.config.ts и других исходниках на @serggrey1992/envbridge с прежними subpaths: /config, /client, /server, /next, /runtime.
2. В scripts заменить CLI на envbridge.
3. Выполнить envbridge generate: generated client/server получают новые импорты. Заголовки, созданные старым пакетом, распознаются и безопасно обновляются; удалять файлы вручную не нужно. Пользовательские TS без точного generated marker по-прежнему не перезаписываются.
4. Для SPA заново выполнить envbridge bootstrap перед запуском. Старый bootstrap marker распознаётся; значения по-прежнему только из public.
5. Пересобрать приложение после изменения импортов и перезапустить процесс.

runtime.config.ts, каталог runtime-env, endpoint /__runtime-env, файл runtime-env.js и функции API сохраняют имена. Внутренний формат snapshot сохранён. Существующие .env и значения не изменяются при переименовании. Runtime-переменные после миграции по-прежнему меняются без rebuild; только смена импортов требует сборки.

В репозитории уже обновлены оба примера, Dockerfile, CLI, tests и документация. Исходное ТЗ specification.md сохранено как исторический документ с прежним именем. GitHub redirect со старого repository URL сохраняет старые ссылки; origin использует новый URL.
