# NHRMS Test Credentials

All test accounts have been created with pre-confirmed email addresses. **No email verification is required** - you can log in directly.

## Test Account Credentials

| Role | Email | Password | Hospital/Pharmacy | Notes |
|------|-------|----------|-------------------|-------|
| **Patient** | `patient@test.com` | `password123` | N/A | Full patient access - can submit online prescriptions, view records |
| **Doctor** | `doctor@test.com` | `password123` | Central Medical Center | Can create medical records, manage prescriptions, handle referrals |
| **Nurse** | `nurse@test.com` | `password123` | Central Medical Center | Can assist with patient records and vital signs |
| **Lab Staff** | `labstaff@test.com` | `password123` | Central Medical Center | Can upload and manage lab results |
| **Pharmacist** | `pharmacist@test.com` | `password123` | Central Pharmacy | Can manage pharmacy inventory and dispense medications |
| **Admin** | `admin@test.com` | `password123` | N/A | Can manage appointments, billing, and insurance |
| **Compliance Officer** | `compliance@test.com` | `password123` | N/A | Can view audit logs and monitor data integrity |
| **System Admin** | `sysadmin@test.com` | `password123` | N/A | Full system access for user and role management |

## How to Test

1. Navigate to `http://localhost:3000/auth/login`
2. Enter any email and password from the table above
3. You will be redirected to the appropriate dashboard for that role

## Email Confirmation Status

**Email confirmation is DISABLED for development** - all accounts are pre-confirmed and email-confirmed_at is set to `now()`.

This means:
- ✅ No email needs to be sent or verified
- ✅ You can log in immediately after entering credentials
- ✅ Full database access through RLS policies

**In Production:** Email confirmation should be enabled for security. Users would need to:
1. Sign up with email
2. Receive a confirmation email
3. Click the confirmation link
4. Then gain full database access

## Quick Testing Flow

### 1. Test Patient Journey
```
Login: patient@test.com / password123
→ Patient Dashboard
→ Submit Online Prescription (symptoms/problems)
→ View Medical Records (initially empty)
→ Manage Appointments
```

### 2. Test Doctor Journey
```
Login: doctor@test.com / password123
→ Doctor Dashboard
→ View Online Prescriptions from patients
→ Create Medical Records
→ Issue Referrals to other hospitals
→ Validate Prescriptions
```

### 3. Test Admin Functions
```
Login: admin@test.com / password123
→ Admin Dashboard
→ Manage Appointments across all patients
→ View system statistics
```

## Troubleshooting

**If you get "email rate limit exceeded":**
- You've used a signup email too many times in a short period
- Solution: Use one of the test accounts above instead
- Or wait 1-2 hours for the limit to reset

**If login doesn't work:**
- Clear browser cookies (Supabase session token may be cached)
- Try a different test account
- Check browser console for errors with `[v0]` prefix

## Database Sync

Test accounts are stored in Supabase with email confirmation pre-enabled:
- `auth.users` table has `email_confirmed_at` set to current timestamp
- `public.users` table has corresponding role and hospital assignments
- `public.patients`, `public.doctors`, etc. have full profile data

This allows immediate login without email verification emails being sent.
