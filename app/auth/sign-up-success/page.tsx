'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Account Created Successfully</CardTitle>
            <CardDescription>Welcome to NHRMS</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              A confirmation email has been sent to your email address. Please check your inbox and click the confirmation link to activate your account.
            </p>

            <div className="bg-muted p-4 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Didn&apos;t receive the email?</strong> Check your spam folder or wait a few moments for the email to arrive.
              </p>
            </div>

            <Link href="/auth/login" className="block">
              <Button className="w-full">Return to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
