# Next Runtime ENV Implementation Plan

Goal: самостоятельный npm MVP по ../../specification.md.
Architecture: server inline snapshot, public proxy endpoint, synchronous error fallback.
Tech stack: TypeScript strict, Node 22+, Next 16, React 19, Vitest, Playwright.

## Ограничения
Только строки/undefined; public allowlist; никакой публикации; существующий внешний проект не менять.

## План
- [x] Прототип: runtime после build, SSR/hydration, global-error, 404. Реальное Next приложение, production standalone, browser assertions; до генератора.
- [x] Runtime: config.ts, client.ts, server.ts, next.tsx. Проверить bootstrap failure, missing key, injection, server-only, cache headers.
- [x] Генератор: generator.ts, dotenv.ts, cli.ts. Сначала тесты сохранения bytes, multiline, invalid config, symlinks, ownership marker, CLI flags. Предварительно проверить все операции, атомарно писать каждый файл, rollback при ошибках.
- [x] Package tests: tarball independent consumer, strict generated types и запрет server imports в client build.
- [x] Документация README, API, deployment, Dockerfile; CI все команды без release.
- [x] Финальная проверка lint/typecheck/unit/build, E2E build once/run twice, npm pack; записать точные результаты.

## Review focus
Multiline dotenv не должен создавать ложные ключи; symlink output не выходит за root; глобальная ошибка без layout bootstrap; NEXT_PUBLIC не фиксируется сборкой; секреты проверяются по canary в client assets.

## Решения
Пользователь поручил выполнить ТЗ и разрешил работу; дополнительные согласования проектирования не запрашиваются. Новый проект размещён в подкаталоге для сохранения существующей библиотеки. Выполнение последовательно в текущем чате.

## Итог
Результаты команд и ограничения: ../../verification.md. Независимое ревью: readonly rollback и multiline backtick исправлены regression tests. Production/standalone A/B и Docker A/B прошли. Пакет не опубликован.
