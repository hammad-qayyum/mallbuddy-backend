# Baseline migration — 2026-05-09

**N5 fix.** This migration captures the full schema as of 2026-05-09 to bring
`prisma/migrations/` back in sync with `schema.prisma`. The previous
"manual `prisma db push`" workflow let the schema drift ahead of the
migrations directory; future PRs can now use `prisma migrate dev` and
`prisma migrate deploy` normally.

## DO NOT run this migration on an existing database

The `migration.sql` in this folder is `CREATE TABLE …` for the entire schema,
not a delta. Applying it to a database that already has these tables will
fail.

## On the production DB (already in sync via `db push`)

Run **once**:

```bash
npx prisma migrate resolve --applied 20260509000000_baseline_after_drift
```

This marks the migration as already-applied in the `_prisma_migrations`
table without running the SQL. After that, `npx prisma migrate deploy`
runs as expected for future migrations.

## On a brand-new database

The SQL in this folder will run normally and produce the schema. No special
steps needed.

## How this folder was generated

```bash
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20260509000000_baseline_after_drift/migration.sql
```
