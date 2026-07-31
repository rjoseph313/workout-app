// Supabase client setup
// Docs: https://supabase.com/docs/reference/javascript/initializing

const SUPABASE_URL = 'https://emiwrhixmqvwigaavnlw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtaXdyaGl4bXF2d2lnYWF2bmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NDgxMzksImV4cCI6MjEwMTAyNDEzOX0.ongx_4ReGpxhzaeqcmbhW7i8FzfNHBYv_E31zrpKqPw';

const { createClient } = supabase;

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
