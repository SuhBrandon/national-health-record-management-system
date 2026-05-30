'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  onLogout: () => void;
  email?: string;
}

export function DashboardHeader({ title, subtitle, onLogout, email }: DashboardHeaderProps) {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          {email && <p className="text-sm text-muted-foreground">{email}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </header>
  );
}

interface ComingSoonCardProps {
  title: string;
  description: string;
}

export function ComingSoonCard({ title, description }: ComingSoonCardProps) {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-6xl mb-4">🚀</div>
          <p className="text-lg font-medium text-foreground mb-2">{description}</p>
          <p className="text-sm text-muted-foreground text-center">
            This feature is currently in development and will be available soon.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
