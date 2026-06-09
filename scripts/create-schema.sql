-- ============================================
-- NATIONAL HEALTH RECORD MANAGEMENT SYSTEM
-- Database Schema
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. CORE TABLES (Roles, Users, Hospitals)
-- ============================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacies table
CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(50),
  role_id UUID NOT NULL REFERENCES roles(id),
  hospital_id UUID REFERENCES hospitals(id),
  pharmacy_id UUID REFERENCES pharmacies(id),
  address TEXT,
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  profile_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. ROLE-SPECIFIC TABLES
-- ============================================

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender VARCHAR(50),
  blood_type VARCHAR(10),
  allergies TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(100) UNIQUE,
  license_expiry DATE,
  specialization VARCHAR(255),
  bio TEXT,
  consultation_fee DECIMAL(10, 2),
  hospital_id UUID REFERENCES hospitals(id),
  is_available BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3, 2),
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nurses table
CREATE TABLE IF NOT EXISTS nurses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(100) UNIQUE,
  license_expiry DATE,
  specialization VARCHAR(255),
  hospital_id UUID REFERENCES hospitals(id),
  shift_type VARCHAR(50), -- morning, afternoon, night, flexible
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab staff table
CREATE TABLE IF NOT EXISTS lab_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(100),
  certification TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  specialization VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacists table
CREATE TABLE IF NOT EXISTS pharmacists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(100) UNIQUE,
  license_expiry DATE,
  pharmacy_id UUID REFERENCES pharmacies(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. HOSPITAL TRANSFER & VISITS
-- ============================================

-- Hospital visits/admissions
CREATE TABLE IF NOT EXISTS hospital_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  admission_date TIMESTAMP NOT NULL,
  discharge_date TIMESTAMP,
  reason_for_visit TEXT,
  admission_type VARCHAR(50), -- emergency, planned, transfer
  discharge_reason VARCHAR(255),
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient hospital transfers
CREATE TABLE IF NOT EXISTS patient_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  from_hospital_id UUID NOT NULL REFERENCES hospitals(id),
  to_hospital_id UUID NOT NULL REFERENCES hospitals(id),
  transfer_date TIMESTAMP NOT NULL,
  transfer_reason TEXT,
  transferred_by_doctor_id UUID REFERENCES doctors(id),
  status VARCHAR(50) DEFAULT 'completed', -- pending, in_transit, completed, cancelled
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. PATIENT PRIVACY CONTROLS
-- ============================================

-- Patient privacy settings (attribute-level visibility)
CREATE TABLE IF NOT EXISTS patient_privacy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  attribute_name VARCHAR(100) NOT NULL, -- blood_type, allergies, medical_history, etc.
  visibility_level VARCHAR(50) DEFAULT 'private', -- private, doctors_only, hospital_staff, public
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(patient_id, attribute_name)
);

-- Doctor access exceptions (allowed to see private attributes)
CREATE TABLE IF NOT EXISTS doctor_access_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  attribute_name VARCHAR(100) NOT NULL,
  access_granted_by_patient BOOLEAN DEFAULT TRUE,
  access_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(patient_id, doctor_id, attribute_name)
);

-- ============================================
-- 5. MEDICAL DOCUMENTS
-- ============================================

-- Medical documents table
CREATE TABLE IF NOT EXISTS medical_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- lab_report, prescription, xray, report, etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),
  uploaded_by_user_id UUID REFERENCES users(id),
  hospital_id UUID REFERENCES hospitals(id),
  document_date TIMESTAMP NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by_doctor_id UUID REFERENCES doctors(id),
  verification_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document sharing with specific doctors
CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
  shared_with_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  shared_by_patient BOOLEAN DEFAULT TRUE,
  shared_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_expiry_date TIMESTAMP,
  can_download BOOLEAN DEFAULT TRUE,
  can_share_further BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, shared_with_doctor_id)
);

-- ============================================
-- 6. MEDICAL RECORDS & PRESCRIPTIONS
-- ============================================

-- Medical records
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  hospital_id UUID REFERENCES hospitals(id),
  diagnosis TEXT NOT NULL,
  diagnosis_icd_code VARCHAR(50), -- ICD-10 code
  treatment TEXT,
  notes TEXT,
  record_date TIMESTAMP NOT NULL,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  drug_name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  duration VARCHAR(100),
  quantity INTEGER,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, cancelled
  issued_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP,
  pharmacy_filled_id UUID REFERENCES pharmacies(id),
  pharmacist_id UUID REFERENCES pharmacists(id),
  fill_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Online prescriptions (patient submissions for doctor/AI review)
CREATE TABLE IF NOT EXISTS online_prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  symptoms TEXT NOT NULL,
  problems TEXT,
  status VARCHAR(50) DEFAULT 'submitted', -- submitted, ai_predicted, doctor_reviewed, doctor_approved, rejected
  submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ai_prediction JSONB, -- {illness: string, confidence: number}
  ai_confidence_score DECIMAL(3, 2),
  ai_analysis_date TIMESTAMP,
  reviewed_by_doctor_id UUID REFERENCES doctors(id),
  doctor_review_notes TEXT,
  doctor_decision TIMESTAMP,
  approved_prescription_id UUID REFERENCES prescriptions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. LAB RESULTS & VITALS
-- ============================================

-- Lab results
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  test_name VARCHAR(255) NOT NULL,
  test_code VARCHAR(50),
  result_value VARCHAR(255),
  unit VARCHAR(50),
  reference_range VARCHAR(100),
  status VARCHAR(50), -- normal, abnormal, critical
  lab_staff_id UUID REFERENCES lab_staff(id),
  hospital_id UUID REFERENCES hospitals(id),
  test_date TIMESTAMP NOT NULL,
  result_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vital signs
CREATE TABLE IF NOT EXISTS vitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  heart_rate INTEGER,
  temperature DECIMAL(5, 2),
  respiratory_rate INTEGER,
  oxygen_saturation DECIMAL(5, 2),
  weight DECIMAL(7, 2),
  height DECIMAL(7, 2),
  recorded_by_user_id UUID REFERENCES users(id),
  recorded_at TIMESTAMP NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. REFERRALS
-- ============================================

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  referred_by_doctor_id UUID NOT NULL REFERENCES doctors(id),
  referred_to_doctor_id UUID REFERENCES doctors(id),
  referred_to_hospital_id UUID REFERENCES hospitals(id),
  specialization VARCHAR(255),
  reason TEXT NOT NULL,
  urgency_level VARCHAR(50) DEFAULT 'normal', -- low, normal, high, critical
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, completed
  referral_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  response_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. APPOINTMENTS
-- ============================================

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  hospital_id UUID REFERENCES hospitals(id),
  appointment_date TIMESTAMP NOT NULL,
  appointment_type VARCHAR(50), -- consultation, follow_up, procedure, etc.
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. PAYMENTS & TRANSACTIONS
-- ============================================

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE, -- MTN Money, Orange Money, etc.
  provider_type VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services (what can be paid for)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  service_type VARCHAR(100), -- consultation, lab, document, etc.
  base_price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'XOF', -- or relevant currency
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions/Payments
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  service_id UUID REFERENCES services(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'XOF',
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  transaction_type VARCHAR(50), -- payment, refund, reversal
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, cancelled
  reference_number VARCHAR(255) UNIQUE,
  external_transaction_id VARCHAR(255),
  pharmacy_id UUID REFERENCES pharmacies(id),
  hospital_id UUID REFERENCES hospitals(id),
  prescription_id UUID REFERENCES prescriptions(id),
  appointment_id UUID REFERENCES appointments(id),
  notes TEXT,
  receipt_url TEXT,
  processed_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. AI PREDICTIONS & AUDIT
-- ============================================

-- AI predictions/analysis (for auditing)
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  online_prescription_id UUID REFERENCES online_prescriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  model_version VARCHAR(50),
  input_symptoms TEXT NOT NULL,
  predicted_illness VARCHAR(255),
  confidence_score DECIMAL(3, 2),
  alternative_diagnoses JSONB, -- [{illness: string, confidence: number}]
  suggested_precautions TEXT,
  analysis_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  doctor_review_status VARCHAR(50), -- pending, approved, rejected
  doctor_id UUID REFERENCES doctors(id),
  doctor_review_date TIMESTAMP,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 12. DOCTOR SPECIALIZATIONS
-- ============================================

-- Doctor specializations/expertise
CREATE TABLE IF NOT EXISTS doctor_specializations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  specialization VARCHAR(255) NOT NULL,
  years_of_experience INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(doctor_id, specialization)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_hospital_id ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_users_pharmacy_id ON users(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital_id ON doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_nurses_hospital_id ON nurses(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_staff_hospital_id ON lab_staff(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pharmacists_pharmacy_id ON pharmacists(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_hospital_visits_patient_id ON hospital_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_hospital_visits_hospital_id ON hospital_visits(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patient_transfers_patient_id ON patient_transfers(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_privacy_settings_patient_id ON patient_privacy_settings(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_access_exceptions_patient_id ON doctor_access_exceptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_access_exceptions_doctor_id ON doctor_access_exceptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_patient_id ON medical_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_online_prescriptions_patient_id ON online_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_patient_id ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_access_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_prescriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Patients can only view their own records
CREATE POLICY "Patients can view own records" ON medical_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.user_id = auth.uid() AND p.id = medical_records.patient_id
    )
  );

-- RLS Policy: Doctors can view records for their hospital's patients
CREATE POLICY "Doctors can view patient records" ON medical_records
  FOR SELECT USING (
    doctor_id = (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM doctors d
      WHERE d.user_id = auth.uid()
      AND d.hospital_id = (
        SELECT hospital_id FROM hospital_visits
        WHERE patient_id = medical_records.patient_id
        AND is_current = TRUE
      )
    )
  );

-- RLS Policy: Patients can view own documents
CREATE POLICY "Patients can view own documents" ON medical_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.user_id = auth.uid() AND p.id = medical_documents.patient_id
    )
  );

-- RLS Policy: Doctors can view shared documents
CREATE POLICY "Doctors can view shared documents" ON medical_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_shares ds
      JOIN doctors d ON d.id = ds.shared_with_doctor_id
      WHERE d.user_id = auth.uid()
      AND ds.document_id = medical_documents.id
    )
  );

-- RLS Policy: Patients can manage own privacy settings
CREATE POLICY "Patients can manage own privacy settings" ON patient_privacy_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.user_id = auth.uid() AND p.id = patient_privacy_settings.patient_id
    )
  );
