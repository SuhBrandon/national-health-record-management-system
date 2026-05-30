# NHRMS - National Healthcare Record Management System

A comprehensive, role-based healthcare management platform built with Next.js 16, Supabase, and TypeScript. NHRMS enables secure patient care coordination, online prescription management, inter-hospital referrals, and medical record sharing with strict role-based access control.

## 🎯 Key Features

### Core Functionality
- **8 Role-Based Dashboards**: Patient, Doctor, Nurse, Lab Staff, Pharmacist, Admin, Compliance Officer, System Admin
- **Secure Authentication**: Email/password with Supabase Auth and JWT tokens
- **Medical Record Management**: Create, view, and manage patient medical records with complete audit trails
- **Online Prescription System**: Patients submit symptoms for doctor review or AI analysis
- **Inter-Hospital Referrals**: Doctors can refer patients between hospitals with acceptance workflow
- **Prescription Management**: Track prescriptions from creation through dispensing
- **Appointment Scheduling**: Schedule and manage appointments between patients and doctors
- **Lab Results Management**: Upload and link lab test results to medical records
- **Pharmacy Inventory**: Manage medication stock and dispensing
- **Audit Logging**: Immutable logs of all critical system actions for compliance
- **Row Level Security**: All data is protected with database-level access controls

### Design
- **Color Scheme**: Blue (primary), White (background), Yellow & Red (secondary/accents)
- **Clean Professional UI**: Built with shadcn/ui components and Tailwind CSS
- **Responsive Design**: Mobile-first approach for all dashboards
- **Modern Aesthetic**: Inspired by professional healthcare platforms

## 🏗️ Architecture

### Database Schema (Supabase PostgreSQL)

**18 Core Tables:**
1. `roles` - System roles with descriptions
2. `hospitals` - Hospital information
3. `pharmacies` - Pharmacy locations
4. `users` - User profiles (extends auth.users)
5. `patients` - Patient demographic data
6. `doctors` - Doctor credentials and specialization
7. `nurses` - Nurse credentials and assignments
8. `lab_staff` - Lab staff profiles
9. `pharmacists` - Pharmacist licenses
10. `medical_records` - Patient medical history
11. `online_prescriptions` - Patient-submitted symptom reports for AI/doctor review
12. `prescriptions` - Dispensable medications with AI suggestions
13. `referrals` - Inter-hospital patient referrals with acceptance workflow
14. `appointments` - Doctor-patient scheduling
15. `lab_results` - Test results linked to medical records
16. `pharmacy_inventory` - Medication stock management
17. `audit_logs` - Immutable action logs for compliance
18. `consent_records` - Patient consent for record sharing

### Row Level Security (RLS) Policies

All tables have RLS enabled with policies enforcing:
- **Patients**: View own records, receive referrals, submit prescriptions
- **Doctors**: Create/edit patient records, validate prescriptions, send referrals
- **Nurses**: Assist with records, track vitals
- **Lab Staff**: Upload and manage lab results
- **Pharmacists**: Manage inventory, dispense medications
- **Admin**: Manage appointments and billing
- **Compliance Officers**: View audit logs and monitor data integrity
- **System Admin**: Full system access

## 📊 Role-Based Dashboards

### Patient Dashboard (`/patient/dashboard`)
- View medical records and prescriptions
- **Submit Online Prescriptions** - Describe symptoms for doctor review or AI analysis
- View lab results and appointments
- Track prescription dispensing status
- Manage health consent settings

### Doctor Dashboard (`/doctor/dashboard`)
- Manage assigned patients
- Create and edit medical records
- **Review Patient Prescriptions** - Approve or reject AI suggestions
- **View Pending Reviews** - Online prescriptions awaiting action
- **Send Patient Referrals** - Refer to other hospitals for specialized care
- Track referral responses
- Manage appointments

### Nurse Dashboard (`/nurse/dashboard`)
- Track patient vitals
- Assist with medical records
- Support doctor workflow

### Lab Staff Dashboard (`/lab-staff/dashboard`)
- Upload lab test results
- Link results to medical records
- Manage test data

### Pharmacist Dashboard (`/pharmacist/dashboard`)
- Manage pharmacy inventory
- Dispense medications per prescriptions
- Track stock levels

### Admin Dashboard (`/admin/dashboard`)
- Manage appointments
- Handle billing and insurance
- System administration

### Compliance Officer Dashboard (`/compliance/dashboard`)
- View audit logs
- Monitor data integrity
- Generate compliance reports

### System Admin Dashboard (`/system-admin/dashboard`)
- User management
- Role assignment
- System configuration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- Supabase account with PostgreSQL database

### Installation

```bash
# Clone and install
git clone <repository>
cd nhrms-system
pnpm install

# Set up environment variables
# Copy .env.example to .env.local and add your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run database migrations (schema is created via Supabase MCP)
# The schema.sql contains all table definitions and RLS policies

# Start development server
pnpm dev
```

### Access the Application
- Navigate to `http://localhost:3000`
- You'll be redirected to `/auth/login`
- Create an account and select your role
- You'll be redirected to your role-specific dashboard

## 🔐 Security Features

- **Row Level Security**: Database-enforced access control at table level
- **JWT Authentication**: Secure session management with Supabase Auth
- **Password Hashing**: Industry-standard bcrypt with configurable iterations
- **Audit Logging**: All critical actions logged with user, timestamp, and changes
- **Parameterized Queries**: Protection against SQL injection
- **CORS Protected**: API routes are protected from unauthorized access
- **Email Verification**: Required for account activation

## 📝 Key Workflows

### Online Prescription Submission
1. Patient submits symptoms/problems on dashboard
2. Status: `submitted` → awaits doctor review
3. Doctor can: approve (create prescription) or request clarification
4. Optional: AI predicts illness with confidence score for doctor verification

### Inter-Hospital Referral Process
1. Doctor selects patient and receiving hospital
2. Creates referral with medical details
3. Referral status: `pending` → awaits attending physician response
4. Receiving doctor: accepts/rejects with optional notes
5. Status transitions: `accepted` → `completed`

### Prescription Management
1. Doctor creates prescription from medical record or online prescription
2. Optional: AI suggests prescriptions based on symptoms
3. Doctor validates/modifies AI suggestions
4. Pharmacist receives and dispenses
5. Status: `approved` → `dispensed`

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with email/password
- **Real-time**: Supabase subscriptions
- **State Management**: React hooks with SWR
- **Deployment**: Vercel (ready to deploy)

## 📦 File Structure

```
app/
  auth/
    login/          # Login page
    sign-up/        # Sign up page
    sign-up-success/ # Confirmation page
    callback/       # OAuth callback
  dashboard/        # Role-based redirect
  patient/
    dashboard/      # Patient home with online prescription form
  doctor/
    dashboard/      # Doctor workspace
  nurse/
    dashboard/      # Nurse workspace
  nurse/
    dashboard/      # Lab staff workspace
  pharmacist/
    dashboard/      # Pharmacist workspace
  admin/
    dashboard/      # Admin workspace
  compliance/
    dashboard/      # Compliance officer workspace
  system-admin/
    dashboard/      # System admin workspace

lib/
  supabase/
    client.ts       # Browser Supabase client
    server.ts       # Server Supabase client
    proxy.ts        # Middleware session handler
  auth.ts           # Auth utilities

components/
  ui/               # shadcn/ui components
  dashboard-components.tsx # Shared dashboard utilities
```

## 🔄 Future Enhancements

### Phase 2 (In Development)
- **AI Prescription Suggestions**: Machine learning model for illness prediction
- **Advanced Lab Results**: Graph visualization of test trends
- **Appointment Reminders**: Email/SMS notifications
- **Mobile App**: React Native version
- **Analytics Dashboard**: System-wide insights and reporting
- **Video Consultations**: Telemedicine integration
- **Prescription History**: Long-term medication tracking
- **Patient Notifications**: Real-time updates on referrals and prescriptions

## 📋 Database Initialization

The database schema is created through Supabase SQL execution. The schema includes:
- All 18 tables with proper relationships
- RLS policies for each table
- Triggers for auto-creating user profiles
- Indexes on frequently queried columns
- Audit log triggers

## 🤝 Contributing

This is a complete implementation of NHRMS v1.0. For bug reports or suggestions, please create an issue.

## 📄 License

Proprietary - National Healthcare Record Management System

## 🎓 Notes

- All timestamps are UTC
- Medical records are immutable (create new records for updates)
- Passwords are hashed with bcrypt (12 rounds minimum)
- All API calls respect RLS policies
- User metadata stores role information for quick access
