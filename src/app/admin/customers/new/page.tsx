
'use client';

import React from 'react';
import { CustomerForm, type CreateCustomerFormValues } from '../CustomerForm';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';

export default function NewCustomerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: adminUserPerformingAction } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();

  const handleCreateCustomer = async (data: CreateCustomerFormValues) => {
     if (!adminUserPerformingAction || !dataService) {
        toast({ title: "Error", description:"Authentication or Data Service Error.", variant: "destructive" });
        return;
     }
    try {
      const existingUser = await dataService.findUserByEmail(data.email);
      if (existingUser) {
        toast({ title: "Creation Failed", description: "A customer with this email already exists.", variant: "destructive" });
        return;
      }
      const newUser = await dataService.addUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role, // role is part of CreateCustomerFormValues
      });

      const logDescription = `Created user "${newUser.name || newUser.email}" (ID: ${newUser.id.substring(0,8)}) with role "${newUser.role}".`;
      await dataService.addActivityLog({
          actorId: adminUserPerformingAction.id,
          actorEmail: adminUserPerformingAction.email,
          actorRole: 'admin',
          actionType: 'USER_CREATE',
          entityType: 'User',
          entityId: newUser.id,
          description: logDescription
      });

      toast({ title: "User Created", description: `User "${data.name || data.email}" has been successfully added.` });
      router.push('/admin/customers');
    } catch (error) {
      console.error("Error creating customer:", error);
      toast({ title: "Error Creating User", description: "Could not create the user. Please try again.", variant: "destructive" });
    }
  };
  
  if (isDataSourceLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary"/>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/customers">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Link>
      </Button>
      <CustomerForm onFormSubmit={handleCreateCustomer as any} isEditing={false} />
    </div>
  );
}
