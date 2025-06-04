// auth.js

const client = supabase.createClient(
  'https://dsexkdjxmhgqahrlkvax.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzZXhrZGp4bWhncWFocmxrdmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODAxNTAsImV4cCI6MjA2NDA1NjE1MH0.RW_ROpcNUNZaK9xGH2OFwHBSmFsGrLj-yi3LWCPBCvA'
);

async function checkWhitelistAccess() {
  const { data: { session } } = await client.auth.getSession();
  const user = session?.user;

  if (!user) {
    window.location.href = '/';
    return;
  }

  const discordId = user.user_metadata.provider_id || user.user_metadata.sub;

  const { data, error } = await client
    .from('users')
    .select('revoked')
    .eq('discord_id', discordId)
    .single();

  if (error || !data || data.revoked !== false) {
    window.location.href = '/';
  }
}

checkWhitelistAccess();
