# Database Setup Guide

This document explains how to initialize the National Health Record Management System database.

## Overview

The database is designed for Supabase PostgreSQL with the following components:

1. **Core Tables**: Roles, Users, Hospitals, Pharmacies
2. **Role-Specific Tables**: Patients, Doctors, Nurses, Lab Staff, Pharmacists
3. **Hospital Transfer & Visits**: Hospital visits, patient transfers
4. **Privacy Controls**: Patient privacy settings, doctor access exceptions
5. **Medical Documents**: Documents and sharing permissions
6. **Medical Records**: Prescriptions, medical records, online prescriptions
7. **Lab & Vitals**: Lab results and vital signs
8. **Referrals & Appointments**: Doctor referrals and patient appointments
9. **Payments**: Payment methods, services, transactions
10. **AI & Audit**: AI predictions and audit logs

## Setup Steps

### Option 1: Using the API Endpoint (Recommended)

1. **Initialize Tables**:
   - Call `POST /api/init-tables` to create all tables
   - This will set up the complete database schema

2. **Seed Initial Data**:
   - Call `POST /api/setup-database` to create:
     - Initial roles (patient, doctor, nurse, lab_staff, pharmacist, admin, compliance_officer, system_admin)
     - Initial hospitals (Central Hospital, Regional Hospital)
     - Initial pharmacies (Central Pharmacy)
     - Payment methods (MTN Money, Orange Money, Credit Card, Bank Transfer)
     - Services (Doctor Consultation, Lab Test, Medical Report, Document Verification)

3. **Create Test Accounts** (Optional):
   - Call `POST /api/setup-test-accounts` to create test user accounts
   - Call `POST /api/finalize-test-setup` to finalize the setup

### Option 2: Using Supabase SQL Editor

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Paste the contents of `scripts/create-schema.sql`
4. Execute the SQL
5. Then run `POST /api/setup-database` to seed initial data

## Database Schema Highlights

### Key Features

1. **Row Level Security (RLS)**:
   - Policies enforce data access based on user roles
   - Patients can only view their own records
   - Doctors can view patient records within their hospital
   - Sensitive data is protected

2. **Relationships**:
   - One-to-many: Hospital → Hospital Visits → Patients
   - Many-to-many: Doctors ↔ Specializations
   - Document Sharing: Medical Documents → Multiple Doctors

3. **Audit Trail**:
   - All user actions are logged in `audit_logs` table
   - AI predictions are tracked in `ai_predictions` table
   - Transaction history is maintained in `transactions` table

### Tables and Relationships

```
users (core)
├── patients (extends users)
├── doctors (extends users)
├── nurses (extends users)
├── lab_staff (extends users)
└── pharmacists (extends users)

hospitals
├── doctors
├── nurses
├── lab_staff
└── hospital_visits

pharmacies
├── pharmacists
└── transactions

medical_documents
└── document_shares (to doctors)

prescriptions
├── online_prescriptions
└── ai_predictions

appointments
referrals
patient_transfers
```

## Environment Variables

Make sure these are set in your Supabase project:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Default Data

After running the setup, the following will be created:

### Hospitals
- **Central Hospital**: Ouagadougou (500 beds)
- **Regional Hospital**: Bobo-Dioulasso (300 beds)

### Pharmacies
- **Central Pharmacy**: Ouagadougou

### Payment Methods
- MTN Money
- Orange Money
- Credit Card
- Bank Transfer

### Services
- Doctor Consultation: 50,000 XOF
- Lab Test: 25,000 XOF
- Medical Report: 10,000 XOF
- Document Verification: 5,000 XOF

## Testing

After setup, you can test with these credentials:

```
Patient: patient@test.com / password123
Doctor: doctor@test.com / password123
Nurse: nurse@test.com / password123
Lab Staff: labstaff@test.com / password123
Pharmacist: pharmacist@test.com / password123
Admin: admin@test.com / password123
```

## Troubleshooting

### Tables Already Exist
If you see "already exists" errors, the tables were already created. This is safe to ignore.

### Missing Service Role Key
Make sure your `SUPABASE_SERVICE_ROLE_KEY` is set in your environment variables. The service role key is needed to bypass RLS policies during setup.

### Foreign Key Constraints
All foreign key constraints are set with `ON DELETE CASCADE` for easy cleanup during testing.

## Next Steps

1. Create test user accounts using `/api/setup-test-accounts`
2. Configure RLS policies in Supabase dashboard if needed
3. Start implementing features listed in the implementation plan

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
