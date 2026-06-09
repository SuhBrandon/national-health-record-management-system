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
    const documentType = searchParams.get('type');
    const isSharedWithMe = searchParams.get('shared') === 'true';

    // Get patient ID from user
    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (isSharedWithMe && !patientData) {
      // User is a doctor
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorData) {
        return NextResponse.json(
          { error: 'User is neither patient nor doctor' },
          { status: 403 }
        );
      }

      // Get documents shared with this doctor
      const { data: documents, error } = await supabase
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
          is_verified,
          patient:patients(user:users(first_name, last_name, email)),
          uploaded_by:users(first_name, last_name),
          hospital:hospitals(name),
          verified_by_doctor:doctors(user:users(first_name, last_name)),
          document_shares!document_shares_document_id_fkey(
            id,
            can_download,
            can_share_further,
            access_expiry_date
          )
        `)
        .eq('document_shares.shared_with_doctor_id', doctorData.id)
        .gte('document_shares.access_expiry_date', new Date().toISOString());

      if (error) {
        throw error;
      }

      return NextResponse.json({ documents }, { status: 200 });
    }

    if (!patientData) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    // Get patient's own documents
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
        is_verified,
        created_at,
        uploaded_by:users(first_name, last_name),
        hospital:hospitals(name),
        verified_by_doctor:doctors(user:users(first_name, last_name)),
        document_shares(
          id,
          shared_with_doctor_id,
          can_download,
          access_expiry_date,
          doctor:doctors(user:users(first_name, last_name, email))
        )
      `)
      .eq('patient_id', patientData.id);

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    const { data: documents, error } = await query.order('document_date', {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error: any) {
    console.error('[v0] Medical documents error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch medical documents' },
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const patientId = formData.get('patientId') as string;
    const documentType = formData.get('documentType') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const hospitalId = formData.get('hospitalId') as string | null;

    if (!file || !patientId || !documentType || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user is patient or staff
    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const { data: staffData } = await supabase
      .from('users')
      .select('id, role_id')
      .eq('id', user.id)
      .single();

    const isStaff = staffData?.role_id && ['doctor', 'nurse', 'lab_staff', 'admin'].includes(staffData.role_id);

    if (!patientData && !isStaff) {
      return NextResponse.json(
        { error: 'Only patients and staff can upload documents' },
        { status: 403 }
      );
    }

    // Upload file to storage
    const fileName = `${patientId}/${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('medical-documents')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('medical-documents')
      .getPublicUrl(fileName);

    // Create document record
    const { data: document, error } = await supabase
      .from('medical_documents')
      .insert({
        patient_id: patientId,
        document_type: documentType,
        title,
        description,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by_user_id: user.id,
        hospital_id: hospitalId || null,
        document_date: new Date().toISOString(),
        is_verified: false,
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
        action: 'medical_document_uploaded',
        entity_type: 'medical_documents',
        entity_id: document[0].id,
        new_values: {
          title: document[0].title,
          document_type: document[0].document_type,
          file_size: document[0].file_size,
        },
      });

    return NextResponse.json({ document: document[0] }, { status: 201 });
  } catch (error: any) {
    console.error('[v0] Document upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}
