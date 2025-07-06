export async function authenticateUser(authHeader: string, supabase: any): Promise<string> {
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  let userId: string;
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('getUser failed, extracting from JWT:', userError?.message);
      // Extract user ID from JWT token
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
      if (!userId) {
        throw new Error('Could not extract user ID from token');
      }
      console.log('Extracted user ID from JWT:', userId);
    } else {
      userId = user.id;
      console.log('Got user ID from getUser:', userId);
    }
  } catch (jwtError) {
    console.error('Authentication completely failed:', jwtError);
    throw new Error('Authentication failed');
  }

  return userId;
}