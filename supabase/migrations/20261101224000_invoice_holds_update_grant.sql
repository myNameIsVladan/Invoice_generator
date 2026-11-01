-- Upsert of the Stripe onboarding intent needs UPDATE. authenticated already
-- has select, insert, and delete. The existing update policy still limits
-- the row to auth.uid().
grant update (user_id, payload) on table public.invoice_holds to authenticated;
