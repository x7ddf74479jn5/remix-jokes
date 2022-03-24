export {};

declare global {
  const SUPABASE_ANON_KEY: string;
  const SUPABASE_URL: string;
  const SESSION_SECRET: string;
  const JOKES_SESSION_STORAGE: KVNamespace;
}
