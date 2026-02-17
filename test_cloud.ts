const url = 'https://ufuhrpqmaeyfocbcqsep.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdWhycHFtYWV5Zm9jYmNxc2VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjM3NjQsImV4cCI6MjA4NjU5OTc2NH0.7XMIlVnSBkkreBZ_pQ62xJHVFuI98Xv99J3rh8ZJw6Q';

// 1. Sign in
const signInRes = await fetch(url + '/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': anonKey
  },
  body: JSON.stringify({
    email: 'magnus@froste.eu',
    password: 'komropp'
  })
});

const signInData = await signInRes.json();
console.log('Sign in status:', signInRes.status);

if (!signInData.access_token) {
  console.log('Sign in failed:', signInData);
  Deno.exit(1);
}

console.log('✅ Got access token');

// 2. Call chat-assistant
const chatRes = await fetch(url + '/functions/v1/chat-assistant', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + signInData.access_token
  },
  body: JSON.stringify({ message: 'Köpt kontorsmaterial för 625 kr', conversationHistory: [] })
});

const chatData = await chatRes.json();
console.log('Chat status:', chatRes.status);
console.log('Chat response:', JSON.stringify(chatData, null, 2).substring(0, 1500));
