#!/usr/bin/env bash
# Role access audit: lists every write rule on the role-sensitive tables and
# fails if any of them lets a plain signed-in user write without a role check
# or ownership check. Run: bash scripts/rls-role-audit.sh
set -euo pipefail
out=$(psql -At -F'|' -c "select tablename, cmd, coalesce(qual,'')||' '||coalesce(with_check,'') from pg_policies where schemaname='public' and tablename in ('user_roles','brand_modes','module_variants','module_families','section_frameworks','london_signage_revisions','approval_requests','learning_suggestions','sign_templates') and cmd<>'SELECT'")
echo "$out"
bad=$(echo "$out" | awk -F'|' '$3 !~ /has_role|auth.uid\(\) *=|= *auth.uid\(\)/' | grep -v '^$' || true)
roles=$(psql -At -c "select count(*) from pg_policies where schemaname='public' and tablename='user_roles' and cmd<>'SELECT'")
[ "$roles" = "0" ] || { echo "FAIL: user_roles has write rules; users could change roles"; exit 1; }
[ -z "$bad" ] || { echo "FAIL: write rules without role/owner check:"; echo "$bad"; exit 1; }
echo "PASS: every write needs a role or ownership; nobody can change their own role"
