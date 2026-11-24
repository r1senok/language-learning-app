# Пилот озвучивания Takku

Google Cloud TTS используется как необязательный серверный генератор пяти фраз. Для воспроизведения скачайте готовые MP3 из каталога генератора и загрузите их через [единый импорт готового аудио](TAKKU_AUDIO_IMPORT.md).

## 1. Настроить Google Cloud

1. В тестовом проекте Google Cloud подключите Billing и включите **Cloud Text-to-Speech API** в **APIs & Services → Library**. Ограничьте доступные квоты проекта до объёма пилота и настройте уведомления о расходах. Уведомление само по себе не останавливает расходы.
2. В **IAM & Admin → Service Accounts** создайте отдельный сервисный аккаунт для пилота. Выдайте ему минимальную роль для синтеза **Cloud Text-to-Speech User** (`roles/texttospeech.user`, если доступна в проекте). Если используется отдельный проект квот, настройте доступ к нему по требованиям Google. Выгрузите JSON-ключ аккаунта и храните его вне репозитория.
3. В списке доступных Google-голосов проверьте язык `et-EE` и имя `et-EE-Standard-A`. Генератор по умолчанию запрашивает именно этот голос. Если Google его не предлагает, остановитесь и проверьте список для проекта. Переход на другой язык не предусмотрен. Список доступности Google и аккаунта в этом пилоте остаётся проверить на своей стороне.

## 2. Подготовить отдельный тестовый Supabase

1. В **SQL Editor → New query** выполните [создание bucket](supabase/migrations/20261124010000_tts_storage.sql) в тестовом проекте. Он содержит только подготовленные для публикации записи. Клиенты читают MP3 по публичным адресам. Политики клиентской записи миграция не добавляет.
2. В **Edge Functions → Secrets** задайте `TAKKU_GOOGLE_TTS_SERVICE_ACCOUNT` (весь JSON сервисного аккаунта) и `TAKKU_TTS_ADMIN_TOKEN` (новый случайный секрет не короче 32 символов). Встроенные `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` Edge Function получает от Supabase. Секреты должны оставаться на сервере.
3. Из корня checkout ветки `feat/takku-interactive-lessons` разверните только эту функцию через Supabase CLI. Подставьте ref именно тестового проекта. Флаг отключает JWT шлюза, так как Edge Function проверяет отдельный серверный токен до любой работы с Google или Storage.

   ```bash
   supabase login
   supabase functions deploy generate-tts --remote=YOUR_TEST_PROJECT_REF --yes --use-api --no-verify-jwt
   ```

   Если используемая версия CLI ещё не поддерживает `--remote`, используйте `--project-ref YOUR_TEST_PROJECT_REF`. Проект можно выбрать и через **Edge Functions** в Dashboard, если используемый редактор поддерживает развёртывание всех файлов каталога [generate-tts](supabase/functions/generate-tts).

## 3. Сгенерировать пять MP3

Сделайте пять авторизованных POST-запросов. Заголовок `x-takku-tts-token` содержит заданный серверный секрет. Токен вводится скрыто и не сохраняется в команде или GitHub.

```bash
read -r -s TAKKU_TTS_TOKEN
printf '\n'
for phrase in tere tere-hommikust head-aega ma-olen-opetaja ma-ei-ole-opetaja; do
  curl --silent --show-error --fail-with-body \
    -X POST -H "x-takku-tts-token: $TAKKU_TTS_TOKEN" \
    "https://YOUR_TEST_PROJECT_REF.supabase.co/functions/v1/generate-tts?id=$phrase" || break
  printf '\n'
done
unset TAKKU_TTS_TOKEN
```

Первый успешный запуск возвращает `generated`, повторный — `cached`. Файлы появятся в **Storage → takku-tts → v1 → et-EE-Standard-A**. Если функция перезапустилась посреди скачивания и запросы продолжают возвращать 409, убедитесь, что генерация завершилась, затем удалите только её служебный `.lock` из `locks/<голос>/` и повторите запрос.

## 4. Подготовить воспроизведение

Для Chirp 3 HD сначала выберите имя, которое Google действительно возвращает для `et-EE`. Затем задайте его в Supabase как `TAKKU_TTS_VOICE` и сгенерируйте пять файлов. Объекты разных голосов хранятся отдельно. Приложение воспроизводит только выбранные вами файлы, загруженные через [нейтральный каталог](TAKKU_AUDIO_IMPORT.md).
