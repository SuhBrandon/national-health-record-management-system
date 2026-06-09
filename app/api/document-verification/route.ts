import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

    // Verify user is a doctor
    const { data: doctorData } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!doctorData) {
      return NextResponse.json(
        { error: 'Only doctors can verify documents' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { documentId, isVerified = true } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Update document verification
    const { data: document, error } = await supabase
      .from('medical_documents')
      .update({
        is_verified: isVerified,
        verified_by_doctor_id: isVerified ? doctorData.id : null,
        verification_date: isVerified ? new Date().toISOString() : null,
      })
      .eq('id', documentId)
      .select();

    if (error) {
      throw error;
    }

    if (document.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Log to audit
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: isVerified ? 'document_verified' : 'document_verification_revoked',
        entity_type: 'medical_documents',
        entity_id: documentId,
        new_values: { is_verified: isVerified },
      });

    return NextResponse.json({ document: document[0] }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Document verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify document' },
      { status: 500 }
    );
  }
}

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

    // Verify user is a doctor
    const { data: doctorData } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!doctorData) {
      return NextResponse.json(
        { error: 'Only doctors can view unverified documents' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get('hospitalId');

    // Get unverified documents for this doctor's hospital
    let query = supabase
      .from('medical_documents')
      .select(`
        id,
        title,
        description,
        document_type,
        document_date,
        file_name,
        file_size,
        mime_type,
        created_at,
        patient:patients(user:users(first_name, last_name, email)),
        uploaded_by:users(first_name, last_name),
        hospital:hospitals(name)
      `)
      .eq('is_verified', false);

    if (hospitalId) {
      query = query.eq('hospital_id', hospitalId);
    }

    const { data: documents, error } = await query.order('created_at', {
      ascending: true,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Unverified documents error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unverified documents' },
      { status: 500 }
    );
  }
}
