#!/usr/bin/env bash
# Rejoue schema.sql + social.sql et les tests RLS sur un Postgres LOCAL jetable (jamais sur ton projet Supabase).
# Usage : PGHOST=localhost PGPORT=5432 PGUSER=postgres ./supabase/run_tests.sh
set -euo pipefail
cd "$(dirname "$0")"
P="psql -v ON_ERROR_STOP=1 -q"
$P postgres -c "drop database if exists hades_rls_test" -c "create database hades_rls_test"
export PGDATABASE=hades_rls_test
$P -f test_stub.sql
$P -f schema.sql 2>&1 | grep -v NOTICE || true
$P -f social.sql 2>&1 | grep -v NOTICE || true
$P -c "grant all on all tables in schema public, storage to authenticated"
$P -f test_rls.sql 2>&1 | grep -v NOTICE | tail -1
