import {
  createClient
} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const SUPABASE_URL = 'https://eojdryupyqrmcpwpvehd.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvamRyeXVweXFybWNwd3B2ZWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MjczMzMsImV4cCI6MjEwMzQwMzMzM30.g706hoUVHWXVGUjpprbfXTqYw-7C_Rmjb9M2xH1_FGs';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
