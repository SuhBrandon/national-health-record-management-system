import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter required' },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Search patients by name, ID, or phone
    const { data: patients, error } = await adminClient
      .from('patients')
      .select('id, user_id, date_of_birth, gender, blood_type')
      .or(`name.ilike.%${query}%,id.ilike.%${query}%,emergency_phone.ilike.%${query}%`)
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with user data
    const { data: users } = await adminClient
      .from('users')
      .select('id, first_name, last_name, email, phone')
      .in(
        'id',
        patients?.map((p) => p.user_id) || []
      );

    const enrichedPatients = patients?.map((patient) => {
      const user = users?.find((u) => u.id === patient.user_id);
      return {
        ...patient,
        name: `${user?.first_name} ${user?.last_name}`,
        email: user?.email,
        phone: user?.phone,
      };
    });

    return NextResponse.json({ patients: enrichedPatients });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
