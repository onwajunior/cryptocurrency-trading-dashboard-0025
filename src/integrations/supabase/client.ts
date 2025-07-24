import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://hfanttpnvznwnunjmjee.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW50dHBudnpud251bmptamVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMzU4NjUsImV4cCI6MjA2ODkxMTg2NX0.1YNeXS8DmlF5rStVS4iSykm-7i8aBhiX7kfvEEExE5A"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)