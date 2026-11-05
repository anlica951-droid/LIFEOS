import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ibgralubpmhuufetxenm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-JVyOExKLldt27G8aGxDnw_4o9Xt9LT";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);