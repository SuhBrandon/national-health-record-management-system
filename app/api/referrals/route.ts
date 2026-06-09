import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'received'; // 'sent' or 'received'

    if (type === 'sent') {
      // Get referrals sent by this doctor
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorData) {
        return NextResponse.json(
          { error: 'User is not a doctor' },
          { status: 403 }
        );
      }

      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`
          id,
          patient_id,
          referred_by_doctor_id,
          referred_to_doctor_id,
          referred_to_hospital_id,
          specialization,
          reason,
          urgency_level,
          status,
          referral_date,
          response_date,
          notes,
          patient:patients(user:users(first_name, last_name, email)),
          referred_to_doctor:doctors(user:users(first_name, last_name, email), hospital:hospitals(name)),
          referred_to_hospital:hospitals(name, city)
        `)
        .eq('referred_by_doctor_id', doctorData.id)
        .order('referral_date', { ascending: false });

      if (error) {
        throw error;
      }

      return NextResponse.json({ referrals }, { status: 200 });
    } else {
      // Get referrals received by this doctor
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorData) {
        // Patient requesting their referrals
        const { data: patientData } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!patientData) {
          return NextResponse.json(
            { error: 'User is neither doctor nor patient' },
            { status: 403 }
          );
        }

        const { data: referrals, error } = await supabase
          .from('referrals')
          .select(`
            id,
            patient_id,
            referred_by_doctor_id,
            referred_to_doctor_id,
            referred_to_hospital_id,
            specialization,
            reason,
            urgency_level,
            status,
            referral_date,
            response_date,
            notes,
            referred_by_doctor:doctors(user:users(first_name, last_name, email), hospital:hospitals(name)),
            referred_to_doctor:doctors(user:users(first_name, last_name, email), hospital:hospitals(name)),
            referred_to_hospital:hospitals(name, city)
          `)
          .eq('patient_id', patientData.id)
          .order('referral_date', { ascending: false });

        if (error) {
          throw error;
        }

        return NextResponse.json({ referrals }, { status: 200 });
      }

      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`
          id,
          patient_id,
          referred_by_doctor_id,
          referred_to_doctor_id,
          referred_to_hospital_id,
          specialization,
          reason,
          urgency_level,
          status,
          referral_date,
          response_date,
          notes,
          patient:patients(user:users(first_name, last_name, email)),
          referred_by_doctor:doctors(user:users(first_name, last_name, email), hospital:hospitals(name))
        `)
        .eq('referred_to_doctor_id', doctorData.id)
        .order('referral_date', { ascending: false });

      if (error) {
        throw error;
      }

      return NextResponse.json({ referrals }, { status: 200 });
    }
  } catch (error: any) {
    console.error('[v0] Referrals error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      patientId,
      referredToDoctorId,
      referredToHospitalId,
      specialization,
      reason,
      urgencyLevel = 'normal',
      notes,
    } = body;

    if (!patientId || !reason) {
      return NextResponse.json(
        { error: 'Patient ID and reason are required' },
        { status: 400 }
      );
    }

    if (!referredToDoctorId && !referredToHospitalId && !specialization) {
      return NextResponse.json(
        { error: 'Must specify a doctor, hospital, or specialization' },
        { status: 400 }
      );
    }

    // Verify user is a doctor
    const { data: doctorData } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!doctorData) {
      return NextResponse.json(
        { error: 'Only doctors can create referrals' },
        { status: 403 }
      );
    }

    // Create referral
    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        patient_id: patientId,
        referred_by_doctor_id: doctorData.id,
        referred_to_doctor_id: referredToDoctorId || null,
        referred_to_hospital_id: referredToHospitalId || null,
        specialization: specialization || null,
        reason,
        urgency_level: urgencyLevel,
        status: 'pending',
        referral_date: new Date().toISOString(),
        notes,
      })
      .select();

    if (error) {
      throw error;
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'referral_created',
        entity_type: 'referrals',
        entity_id: referral[0].id,
        new_values: {
          patient_id: patientId,
          reason,
          urgency_level: urgencyLevel,
        },
      });

    return NextResponse.json({ referral: referral[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[v0] Referral creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create referral' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { referralId, status, responseNotes } = body;

    if (!referralId || !status) {
      return NextResponse.json(
        { error: 'Referral ID and status are required' },
        { status: 400 }
      );
    }

    // Verify referral exists and user can respond
    const { data: referral } = await supabase
      .from('referrals')
      .select('referred_to_doctor_id')
      .eq('id', referralId)
      .single();

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    }

    const { data: doctorData } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!doctorData || (referral.referred_to_doctor_id !== doctorData.id && status !== 'pending')) {
      return NextResponse.json(
        { error: 'Not authorized to update this referral' },
        { status: 403 }
      );
    }

    // Update referral
    const { data: updated, error } = await supabase
      .from('referrals')
      .update({
        status,
        response_date: ['accepted', 'rejected'].includes(status) ? new Date().toISOString() : null,
        notes: responseNotes || null,
      })
      .eq('id', referralId)
      .select();

    if (error) {
      throw error;
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'referral_updated',
        entity_type: 'referrals',
        entity_id: referralId,
        new_values: { status },
      });

    return NextResponse.json({ referral: updated[0] }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Referral update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update referral' },
      { status: 500 }
    );
  }
}
