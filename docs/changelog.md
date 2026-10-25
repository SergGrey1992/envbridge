# Changelog

## 0.1.1

- Упрощены Next.js маршруты: `/runtime-env` и `/runtime-env/bootstrap`, обычные папки без кодирования.
- Клиентский fallback использует `/runtime-env`; proxy также сохраняет старый `/__runtime-env`.
- Добавлен пример Next.js 16 Cache Components с partialPrefetching и проверкой runtime A/B.
- Обновлены инструкции по версиям Next.js и миграции с 0.1.0.

При обновлении перенесите Route Handler и обновите proxy matcher, если он используется: [инструкция](migration.md).
