# Legacy SQL scripts (superseded — do not run)

These were run by hand in the Supabase SQL editor between April and July 2026.
They never fully described the real database (several tables were created in
the dashboard), and some contain the unsafe "allow all to anon" policies that
`supabase/migrations/20261125000003_security_lockdown.sql` removes.

They are kept only for history. The schema is now defined by
`supabase/migrations/` and applied with `npm run db:migrate`.
