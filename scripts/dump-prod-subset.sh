#!/usr/bin/env bash
# Dumps a subset of production data into the local Docker DB.
# Usage: PROD_DATABASE_URL="..." ./scripts/dump-prod-subset.sh [limit]
# Requires: Docker running with `docker compose up -d`

set -euo pipefail

LIMIT="${1:-100}"
DB="${PROD_DATABASE_URL:?PROD_DATABASE_URL must be set}"
CONTAINER="autoguessr-db-1"
TMPDIR_HOST="$(mktemp -d)"

cleanup() { rm -rf "$TMPDIR_HOST"; }
trap cleanup EXIT

echo "Dumping prod subset (limit=${LIMIT})..."

dump_table() {
  local label="$1"
  local query="$2"
  local file="${TMPDIR_HOST}/${label}.csv"
  docker run --rm postgres:16 psql "$DB" -t -A -F',' -c "COPY ($query) TO STDOUT WITH CSV HEADER" > "$file"
  echo "  ✓ ${label}"
}

dump_table "Category"    'SELECT * FROM "Category"'
dump_table "Region"      'SELECT * FROM "Region"'
dump_table "FeatureFlag" 'SELECT * FROM "FeatureFlag"'
dump_table "KnownMake"   'SELECT * FROM "KnownMake"'
dump_table "KnownModel"  'SELECT * FROM "KnownModel"'

dump_table "Vehicle" "
  WITH selected AS (
    SELECT v.id FROM \"Vehicle\" v
    JOIN \"Image\" i ON i.\"vehicleId\" = v.id
    WHERE i.\"isActive\" = true
    GROUP BY v.id
    ORDER BY COUNT(i.id) DESC
    LIMIT ${LIMIT}
  )
  SELECT v.* FROM \"Vehicle\" v WHERE v.id IN (SELECT id FROM selected)"

dump_table "VehicleAlias" "
  WITH selected AS (
    SELECT v.id FROM \"Vehicle\" v
    JOIN \"Image\" i ON i.\"vehicleId\" = v.id
    WHERE i.\"isActive\" = true
    GROUP BY v.id ORDER BY COUNT(i.id) DESC LIMIT ${LIMIT}
  )
  SELECT va.* FROM \"VehicleAlias\" va WHERE va.\"vehicleId\" IN (SELECT id FROM selected)"

dump_table "VehicleCategory" "
  WITH selected AS (
    SELECT v.id FROM \"Vehicle\" v
    JOIN \"Image\" i ON i.\"vehicleId\" = v.id
    WHERE i.\"isActive\" = true
    GROUP BY v.id ORDER BY COUNT(i.id) DESC LIMIT ${LIMIT}
  )
  SELECT vc.* FROM \"VehicleCategory\" vc WHERE vc.\"vehicleId\" IN (SELECT id FROM selected)"

dump_table "Image" "
  WITH selected AS (
    SELECT v.id FROM \"Vehicle\" v
    JOIN \"Image\" i ON i.\"vehicleId\" = v.id
    WHERE i.\"isActive\" = true
    GROUP BY v.id ORDER BY COUNT(i.id) DESC LIMIT ${LIMIT}
  )
  SELECT i.* FROM \"Image\" i
  WHERE i.\"vehicleId\" IN (SELECT id FROM selected)
  AND i.\"isActive\" = true"

dump_table "ImageStats" "
  WITH selected AS (
    SELECT v.id FROM \"Vehicle\" v
    JOIN \"Image\" i ON i.\"vehicleId\" = v.id
    WHERE i.\"isActive\" = true
    GROUP BY v.id ORDER BY COUNT(i.id) DESC LIMIT ${LIMIT}
  )
  SELECT s.* FROM \"ImageStats\" s
  JOIN \"Image\" i ON i.id = s.\"imageId\"
  WHERE i.\"vehicleId\" IN (SELECT id FROM selected)"

echo "Loading into local DB (container: ${CONTAINER})..."

# Truncate in dependency order before loading
docker exec "$CONTAINER" psql -U postgres autoguessr_local -c "
  TRUNCATE \"ImageStats\", \"Image\", \"VehicleCategory\", \"VehicleAlias\", \"Vehicle\",
           \"KnownModel\", \"KnownMake\", \"FeatureFlag\", \"Region\", \"Category\" CASCADE;
"

load_table() {
  local table="$1"
  local file="${TMPDIR_HOST}/${table}.csv"
  docker exec -i "$CONTAINER" psql -U postgres autoguessr_local \
    -c "COPY \"${table}\" FROM STDIN WITH CSV HEADER" < "$file"
  echo "  ✓ ${table}"
}

load_table "Category"
load_table "Region"
load_table "FeatureFlag"
load_table "KnownMake"
load_table "KnownModel"
load_table "Vehicle"
load_table "VehicleAlias"
load_table "VehicleCategory"
load_table "Image"
load_table "ImageStats"

echo "Done."
