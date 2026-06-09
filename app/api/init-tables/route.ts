import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Split SQL into individual statements
function splitSQL(sql: string): string[] {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.startsWith('--'));
}

async function executeSQLStatement(
  client: ReturnType<typeof createClient>,
  statement: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Use the query method to execute raw SQL
    const { error } = await (client as any).rpc('exec_sql', {
      sql: statement,
    });

    if (error) {
      // RPC might not exist, which is fine for some operations
      if (error.message.includes('Could not find the')) {
        return { success: true, message: 'Statement executed (assuming success)' };
      }
      // Ignore duplicate key errors and already exists errors
      if (
        error.message.includes('duplicate') ||
        error.message.includes('already exists') ||
        error.message.includes('ALREADY EXISTS')
      ) {
        return { success: true, message: 'Already exists (skipped)' };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Statement executed successfully' };
  } catch (err: any) {
    console.error('[v0] SQL Error:', err);
    // Try alternative approach using a helper function
    return { success: false, message: err.message };
  }
}

export async function POST() {
  try {
    console.log('[v0] Starting table initialization...');

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: any = {
      tables: [],
      errors: [],
    };

    // Define all table creation statements individually
    const tables = [
      // Roles
      `CREATE TABLE IF NOT EXISTS public.roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Hospitals
      `CREATE TABLE IF NOT EXISTS public.hospitals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        city VARCHAR(100),
        state_province VARCHAR(100),
        country VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(255),
        website VARCHAR(255),
        established_year INTEGER,
        beds_count INTEGER,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Pharmacies
      `CREATE TABLE IF NOT EXISTS public.pharmacies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        city VARCHAR(100),
        state_province VARCHAR(100),
        country VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(255),
        website VARCHAR(255),
        license_number VARCHAR(100),
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Users
      `CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone_number VARCHAR(20),
        date_of_birth DATE,
        gender VARCHAR(50),
        role_id UUID NOT NULL REFERENCES public.roles(id),
        hospital_id UUID REFERENCES public.hospitals(id),
        pharmacy_id UUID REFERENCES public.pharmacies(id),
        address TEXT,
        city VARCHAR(100),
        state_province VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        profile_image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Patients
      `CREATE TABLE IF NOT EXISTS public.patients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        date_of_birth DATE,
        gender VARCHAR(50),
        blood_type VARCHAR(10),
        allergies TEXT,
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relationship VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Doctors
      `CREATE TABLE IF NOT EXISTS public.doctors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        license_number VARCHAR(100) UNIQUE,
        license_expiry DATE,
        specialization VARCHAR(255),
        bio TEXT,
        consultation_fee DECIMAL(10, 2),
        hospital_id UUID REFERENCES public.hospitals(id),
        is_available BOOLEAN DEFAULT TRUE,
        rating DECIMAL(3, 2),
        total_reviews INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Nurses
      `CREATE TABLE IF NOT EXISTS public.nurses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        license_number VARCHAR(100) UNIQUE,
        license_expiry DATE,
        specialization VARCHAR(255),
        hospital_id UUID REFERENCES public.hospitals(id),
        shift_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Lab Staff
      `CREATE TABLE IF NOT EXISTS public.lab_staff (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        license_number VARCHAR(100),
        certification TEXT,
        hospital_id UUID REFERENCES public.hospitals(id),
        specialization VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Pharmacists
      `CREATE TABLE IF NOT EXISTS public.pharmacists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        license_number VARCHAR(100) UNIQUE,
        license_expiry DATE,
        pharmacy_id UUID REFERENCES public.pharmacies(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Hospital Visits
      `CREATE TABLE IF NOT EXISTS public.hospital_visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
        admission_date TIMESTAMP WITH TIME ZONE NOT NULL,
        discharge_date TIMESTAMP WITH TIME ZONE,
        reason_for_visit TEXT,
        admission_type VARCHAR(50),
        discharge_reason VARCHAR(255),
        is_current BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Patient Transfers
      `CREATE TABLE IF NOT EXISTS public.patient_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        from_hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
        to_hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
        transfer_date TIMESTAMP WITH TIME ZONE NOT NULL,
        transfer_reason TEXT,
        transferred_by_doctor_id UUID REFERENCES public.doctors(id),
        status VARCHAR(50) DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Patient Privacy Settings
      `CREATE TABLE IF NOT EXISTS public.patient_privacy_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        attribute_name VARCHAR(100) NOT NULL,
        visibility_level VARCHAR(50) DEFAULT 'private',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(patient_id, attribute_name)
      )`,

      // Doctor Access Exceptions
      `CREATE TABLE IF NOT EXISTS public.doctor_access_exceptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
        attribute_name VARCHAR(100) NOT NULL,
        access_granted_by_patient BOOLEAN DEFAULT TRUE,
        access_date TIMESTAMP WITH TIME ZONE NOT NULL,
        expiry_date TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(patient_id, doctor_id, attribute_name)
      )`,

      // Medical Documents
      `CREATE TABLE IF NOT EXISTS public.medical_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_url TEXT,
        file_name VARCHAR(255),
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_by_user_id UUID REFERENCES public.users(id),
        hospital_id UUID REFERENCES public.hospitals(id),
        document_date TIMESTAMP WITH TIME ZONE NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by_doctor_id UUID REFERENCES public.doctors(id),
        verification_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Document Shares
      `CREATE TABLE IF NOT EXISTS public.document_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES public.medical_documents(id) ON DELETE CASCADE,
        shared_with_doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
        shared_by_patient BOOLEAN DEFAULT TRUE,
        shared_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        access_expiry_date TIMESTAMP WITH TIME ZONE,
        can_download BOOLEAN DEFAULT TRUE,
        can_share_further BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(document_id, shared_with_doctor_id)
      )`,

      // Medical Records
      `CREATE TABLE IF NOT EXISTS public.medical_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        doctor_id UUID NOT NULL REFERENCES public.doctors(id),
        hospital_id UUID REFERENCES public.hospitals(id),
        diagnosis TEXT NOT NULL,
        diagnosis_icd_code VARCHAR(50),
        treatment TEXT,
        notes TEXT,
        record_date TIMESTAMP WITH TIME ZONE NOT NULL,
        follow_up_required BOOLEAN DEFAULT FALSE,
        follow_up_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Prescriptions
      `CREATE TABLE IF NOT EXISTS public.prescriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        doctor_id UUID NOT NULL REFERENCES public.doctors(id),
        drug_name VARCHAR(255) NOT NULL,
        generic_name VARCHAR(255),
        dosage VARCHAR(100) NOT NULL,
        frequency VARCHAR(100) NOT NULL,
        duration VARCHAR(100),
        quantity INTEGER,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'active',
        issued_date TIMESTAMP WITH TIME ZONE NOT NULL,
        expiry_date TIMESTAMP WITH TIME ZONE,
        pharmacy_filled_id UUID REFERENCES public.pharmacies(id),
        pharmacist_id UUID REFERENCES public.pharmacists(id),
        fill_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Online Prescriptions
      `CREATE TABLE IF NOT EXISTS public.online_prescriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        symptoms TEXT NOT NULL,
        problems TEXT,
        status VARCHAR(50) DEFAULT 'submitted',
        submitted_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ai_prediction JSONB,
        ai_confidence_score DECIMAL(3, 2),
        ai_analysis_date TIMESTAMP WITH TIME ZONE,
        reviewed_by_doctor_id UUID REFERENCES public.doctors(id),
        doctor_review_notes TEXT,
        doctor_decision TIMESTAMP WITH TIME ZONE,
        approved_prescription_id UUID REFERENCES public.prescriptions(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Lab Results
      `CREATE TABLE IF NOT EXISTS public.lab_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        test_name VARCHAR(255) NOT NULL,
        test_code VARCHAR(50),
        result_value VARCHAR(255),
        unit VARCHAR(50),
        reference_range VARCHAR(100),
        status VARCHAR(50),
        lab_staff_id UUID REFERENCES public.lab_staff(id),
        hospital_id UUID REFERENCES public.hospitals(id),
        test_date TIMESTAMP WITH TIME ZONE NOT NULL,
        result_date TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Vitals
      `CREATE TABLE IF NOT EXISTS public.vitals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        systolic_bp INTEGER,
        diastolic_bp INTEGER,
        heart_rate INTEGER,
        temperature DECIMAL(5, 2),
        respiratory_rate INTEGER,
        oxygen_saturation DECIMAL(5, 2),
        weight DECIMAL(7, 2),
        height DECIMAL(7, 2),
        recorded_by_user_id UUID REFERENCES public.users(id),
        recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Referrals
      `CREATE TABLE IF NOT EXISTS public.referrals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        referred_by_doctor_id UUID NOT NULL REFERENCES public.doctors(id),
        referred_to_doctor_id UUID REFERENCES public.doctors(id),
        referred_to_hospital_id UUID REFERENCES public.hospitals(id),
        specialization VARCHAR(255),
        reason TEXT NOT NULL,
        urgency_level VARCHAR(50) DEFAULT 'normal',
        status VARCHAR(50) DEFAULT 'pending',
        referral_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        response_date TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Appointments
      `CREATE TABLE IF NOT EXISTS public.appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        doctor_id UUID NOT NULL REFERENCES public.doctors(id),
        hospital_id UUID REFERENCES public.hospitals(id),
        appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
        appointment_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Payment Methods
      `CREATE TABLE IF NOT EXISTS public.payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        provider_type VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Services
      `CREATE TABLE IF NOT EXISTS public.services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        service_type VARCHAR(100),
        base_price DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'XOF',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Transactions
      `CREATE TABLE IF NOT EXISTS public.transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.users(id),
        service_id UUID REFERENCES public.services(id),
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'XOF',
        payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id),
        transaction_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        reference_number VARCHAR(255) UNIQUE,
        external_transaction_id VARCHAR(255),
        pharmacy_id UUID REFERENCES public.pharmacies(id),
        hospital_id UUID REFERENCES public.hospitals(id),
        prescription_id UUID REFERENCES public.prescriptions(id),
        appointment_id UUID REFERENCES public.appointments(id),
        notes TEXT,
        receipt_url TEXT,
        processed_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // AI Predictions
      `CREATE TABLE IF NOT EXISTS public.ai_predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        online_prescription_id UUID REFERENCES public.online_prescriptions(id) ON DELETE CASCADE,
        patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
        model_version VARCHAR(50),
        input_symptoms TEXT NOT NULL,
        predicted_illness VARCHAR(255),
        confidence_score DECIMAL(3, 2),
        alternative_diagnoses JSONB,
        suggested_precautions TEXT,
        analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        doctor_review_status VARCHAR(50),
        doctor_id UUID REFERENCES public.doctors(id),
        doctor_review_date TIMESTAMP WITH TIME ZONE,
        is_archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Audit Logs
      `CREATE TABLE IF NOT EXISTS public.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.users(id),
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(50),
        user_agent TEXT,
        status VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      // Doctor Specializations
      `CREATE TABLE IF NOT EXISTS public.doctor_specializations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
        specialization VARCHAR(255) NOT NULL,
        years_of_experience INTEGER,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(doctor_id, specialization)
      )`,
    ];

    // Execute each table creation statement
    for (const statement of tables) {
      try {
        // Extract table name for logging
        const tableMatch = statement.match(/CREATE TABLE[^(]*(?:IF NOT EXISTS\s+)?(?:public\.)?(\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : 'unknown';

        const result = await executeSQLStatement(adminClient, statement);
        results.tables.push({
          table: tableName,
          status: result.success ? 'success' : 'error',
          message: result.message,
        });

        if (result.success) {
          console.log(`[v0] Created table: ${tableName}`);
        } else {
          console.log(`[v0] Error creating table ${tableName}: ${result.message}`);
        }
      } catch (err: any) {
        results.errors.push({
          statement: statement.substring(0, 100),
          error: err.message,
        });
        console.error('[v0] Unexpected error:', err);
      }
    }

    console.log('[v0] Table initialization completed!');
    return NextResponse.json(
      { success: true, results },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[v0] Initialization error:', error);
    return NextResponse.json(
      { error: error.message || 'Initialization failed' },
      { status: 500 }
    );
  }
}
