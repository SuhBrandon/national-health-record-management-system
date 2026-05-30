import { createClient } from '@/lib/supabase/server';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  // Get user profile with role info
  const { data: profile } = await supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      role_id,
      roles:role_id (
        id,
        name
      )
    `)
    .eq('id', user.id)
    .single();

  return {
    ...user,
    profile,
  };
}

export async function getUserRole() {
  const user = await getCurrentUser();
  if (!user?.profile?.roles) {
    return null;
  }
  return user.profile.roles.name;
}
