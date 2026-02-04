#!/usr/bin/env bash
set -e

Color_Off='\033[0m'
BGYELLOW='\033[30;43m'
BGGREEN='\033[30;42m'
BGRED='\033[30;41m'
TEXTRED='\033[30;31m'

extract_git_url() {
  local url="$1"

  # https://user.github.io/repo[/] → https://github.com/user/repo.git
  if [[ "$url" =~ ^https://([^.]+)\.github\.io/([^/]+)/?$ ]]; then
    echo "https://github.com/${BASH_REMATCH[1]}/${BASH_REMATCH[2]}.git"
    return
  fi

  # если уже git-репозиторий — вернуть как есть
  if [[ "$url" =~ \.git$ ]]; then
    echo "$url"
    return
  fi

  # fallback
  echo "$url"
}

# ==================================================
# Подготовка env
# ==================================================
if [ -z "${JSON_PATH:-}" ] && [ -f .env ]; then
  export JSON_PATH=$(grep '^JSON_PATH=' .env | awk -F= '{print $2}' | sed 's/^"//; s/"$//')
fi

if [ -z "${DOMAIN:-}" ] && [ -f .env ]; then
  export DOMAIN=$(grep '^DOMAIN=' .env | awk -F= '{print $2}' | sed 's/^"//; s/"$//')
fi

if [ -z "${JSON_PATH:-}" ]; then
  echo "❌ Error: JSON_PATH is not set"
  exit 1
fi

if [ -z "${DOMAIN:-}" ]; then
  echo "❌ Error: DOMAIN is not set"
  exit 1
fi

echo "▶ JSON_PATH: $JSON_PATH"
echo "▶ DOMAIN:    $DOMAIN"

# ==================================================
# Переменные
# ==================================================
GIT_REPO_URL=$(extract_git_url "$JSON_PATH")
REPO_NAME=$(basename "$GIT_REPO_URL" .git)
TMP_DIR="tmp/$REPO_NAME"

REMOTE_DATA_PATH="src/$DOMAIN/data"
LOCAL_DATA_DIR="src/data"

# ==================================================
# Клонирование (sparse checkout)
# ==================================================
echo "▶ Git repo: $GIT_REPO_URL"

rm -rf "$TMP_DIR"

git clone \
  --filter=blob:none \
  --depth=1 \
  --single-branch \
  --no-checkout \
  "$GIT_REPO_URL" \
  "$TMP_DIR"

cd "$TMP_DIR"

git sparse-checkout init --cone
git sparse-checkout set \
  "src/$DOMAIN/data" \
  "src/model-sections" \
  "src/models.json" \
  "src/cars.json"

git checkout main

cd ../..

# ==================================================
# Копирование JSON
# ==================================================
echo "▶ Sync JSON data…"

mkdir -p "$LOCAL_DATA_DIR"

rsync -a \
  "$TMP_DIR/$REMOTE_DATA_PATH/" \
  "$LOCAL_DATA_DIR/"

# ==================================================
# Парсинг брендов
# ==================================================
SETTINGS_FILE="$LOCAL_DATA_DIR/settings.json"

if [ ! -f "$SETTINGS_FILE" ]; then
  echo "❌ Error: settings.json not found"
  rm -rf "$TMP_DIR"
  exit 1
fi

BRANDS_RAW=$(grep -o '"brand"[[:space:]]*:[[:space:]]*"[^"]*"' "$SETTINGS_FILE" \
  | sed 's/.*"brand"[[:space:]]*:[[:space:]]*"//; s/"$//')

IFS=',' read -ra BRANDS <<< "$BRANDS_RAW"

# ==================================================
# Копирование model-sections по брендам
# ==================================================
echo "▶ Sync model-sections…"

for BRAND in "${BRANDS[@]}"; do
  RAW_BRAND=$(echo "$BRAND" | xargs)

  NORMALIZED_BRAND=$(echo "$RAW_BRAND" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9 ]//g; s/[[:space:]]\+/-/g')

  SRC_DIR="$TMP_DIR/src/model-sections/$NORMALIZED_BRAND"
  DEST_DIR="$LOCAL_DATA_DIR/model-sections/$NORMALIZED_BRAND"

  if [ -d "$SRC_DIR" ]; then
    mkdir -p "$DEST_DIR"
    rsync -a "$SRC_DIR/" "$DEST_DIR/"
    echo "  ✔ $RAW_BRAND → $NORMALIZED_BRAND"
  else
    echo "  ⚠ model-sections not found for brand: $RAW_BRAND ($NORMALIZED_BRAND)"
  fi
done

echo -e "\n${BGGREEN}Копируем общий models.json...${Color_Off}"
rsync -a "$TMP_DIR/src/models.json" "$LOCAL_DATA_DIR/all-models.json"

# Проверяем, что файл скачался
if [ ! -s "$LOCAL_DATA_DIR/all-models.json" ]; then
    printf "${BGRED}Внимание: общий файл models.json не найден или получен некорректный файл!${Color_Off}\n"
else
    node .github/scripts/filterModelsByBrand.js
fi

# Скачиваем общий cars.json
echo -e "\n${BGGREEN}Копируем общий cars.json...${Color_Off}"
rsync -a "$TMP_DIR/src/cars.json" "$LOCAL_DATA_DIR/all-cars.json"

# Проверяем, что файл скачался
if [ ! -s "$LOCAL_DATA_DIR/all-cars.json" ]; then
    printf "${BGRED}Внимание: общий файл cars.json не найден или получен некорректный файл!${Color_Off}\n"
else
    printf "${BGGREEN}Общий файл cars.json успешно скопирован${Color_Off}\n"
fi

# Удаляем временную директорию после обработки всех брендов
printf "\n${BGYELLOW}Удаляем временный репозиторий...${Color_Off}\n"
rm -rf "$TMP_DIR"
trap - EXIT INT TERM

echo "✅ Done"
