import {
  createClient
} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const SUPABASE_URL = 'https://kdsielxrxhamperloyotg.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkc2llbHhyeGhhbXBlcmxveXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MjA3NDIsImV4cCI6MjEwMzA5Njc0Mn0.RR1YO3RFN5XUiSsTOKWi2Le5HVr5Rlf5he6ncE3DCy0';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
