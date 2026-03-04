import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://prvtymoorqzdmnckjdng.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydnR5bW9vcnF6ZG1uY2tqZG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDQ2MTgsImV4cCI6MjA4ODIyMDYxOH0.7-9BdxnbDbcGnx6iDl-gB9YPNM0nEOqfvnPYfzqRaAM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
