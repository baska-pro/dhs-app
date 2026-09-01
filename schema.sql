-- ====================================================================
-- DHS App (Daily Habit System) - Supabase / PostgreSQL Schema
-- ====================================================================
-- Gunakan pada project Supabase pribadi/dedicated untuk DHS App.
-- Client mengirim header x-dhs-sync-key dan RLS hanya mengizinkan row dengan
-- sync_key yang sama. Ini lebih aman daripada policy anon USING (true), namun
-- Sync Key tetap harus diperlakukan sebagai rahasia bersama.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.dhs_sync_data (
  sync_key TEXT PRIMARY KEY CHECK (char_length(sync_key) BETWEEN 8 AND 128),
  user_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  daily_logs JSONB NOT NULL DEFAULT '{}'::jsonb,
  system_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dhs_sync_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon public access to dhs_sync_data" ON public.dhs_sync_data;
DROP POLICY IF EXISTS "Allow anon access to dhs_sync_data" ON public.dhs_sync_data;
DROP POLICY IF EXISTS "DHS scoped anon access to dhs_sync_data" ON public.dhs_sync_data;

CREATE POLICY "DHS scoped anon access to dhs_sync_data"
ON public.dhs_sync_data
FOR ALL
TO anon
USING (
  sync_key = COALESCE(
    (COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-dhs-sync-key'),
    ''
  )
)
WITH CHECK (
  sync_key = COALESCE(
    (COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-dhs-sync-key'),
    ''
  )
);

CREATE INDEX IF NOT EXISTS idx_dhs_sync_data_sync_key
  ON public.dhs_sync_data(sync_key);

CREATE OR REPLACE FUNCTION public.update_dhs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_dhs_sync_data_updated_at ON public.dhs_sync_data;

CREATE TRIGGER tr_dhs_sync_data_updated_at
BEFORE UPDATE ON public.dhs_sync_data
FOR EACH ROW
EXECUTE FUNCTION public.update_dhs_timestamp();
