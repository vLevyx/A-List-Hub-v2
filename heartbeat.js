import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const client = createClient(
  'https://dsexkdjxmhgqahrlkvax.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzZXhrZGp4bWhncWFocmxrdmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODAxNTAsImV4cCI6MjA2NDA1NjE1MH0.RW_ROpcNUNZaK9xGH2OFwHBSmFsGrLj-yi3LWCPBCvA'
);

async function sendHeartbeat() {
  const { data: session } = await client.auth.getSession();
  if (session?.session) {
    const userId = session.session.user.user_metadata.provider_id;
    await client
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('discord_id', userId);
  }
}

sendHeartbeat();
setInterval(sendHeartbeat, 2 * 60 * 1000);
