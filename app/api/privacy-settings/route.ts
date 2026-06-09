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

    // Get patient ID from user
    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!patientData) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    // Get privacy settings
    const { data: settings, error } = await supabase
      .from('patient_privacy_settings')
      .select('*')
      .eq('patient_id', patientData.id);

    if (error) {
      throw error;
    }

    // Define all possible attributes
    const allAttributes = [
      'blood_type',
      'allergies',
      'medical_history',
      'prescriptions',
      'lab_results',
      'medications',
      'emergency_contact',
      'insurance_info',
      'genetic_info',
      'mental_health_records',
    ];

    // Create default settings for attributes not yet configured
    const existingAttrs = new Set(settings?.map((s) => s.attribute_name) || []);
    const defaults = allAttributes
      .filter((attr) => !existingAttrs.has(attr))
      .map((attr) => ({
        patient_id: patientData.id,
        attribute_name: attr,
        visibility_level: 'private',
      }));

    if (defaults.length > 0) {
      await supabase.from('patient_privacy_settings').insert(defaults);
    }

    // Get exceptions
    const { data: exceptions } = await supabase
      .from('doctor_access_exceptions')
      .select(`
        id,
        attribute_name,
        access_date,
        expiry_date,
        doctor:doctors(id, user:users(first_name, last_name, email))
      `)
      .eq('patient_id', patientData.id)
      .order('access_date', { ascending: false });

    return NextResponse.json(
      { settings, exceptions },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[v0] Privacy settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch privacy settings' },
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
    const { attributeName, visibilityLevel } = body;

    // Get patient ID from user
    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!patientData) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    // Update privacy setting
    const { data: setting, error } = await supabase
      .from('patient_privacy_settings')
      .upsert(
        {
          patient_id: patientData.id,
          attribute_name: attributeName,
          visibility_level: visibilityLevel,
        },
        { onConflict: 'patient_id,attribute_name' }
      )
      .select();

    if (error) {
      throw error;
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'privacy_setting_updated',
        entity_type: 'patient_privacy_settings',
        entity_id: setting[0].id,
        new_values: { visibility_level: visibilityLevel },
      });

    return NextResponse.json({ setting: setting[0] }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Privacy setting update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update privacy setting' },
      { status: 500 }
    );
  }
}
