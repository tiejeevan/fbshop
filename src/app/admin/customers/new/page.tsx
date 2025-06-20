
'use client';

import React from 'react';
import { CustomerForm, type CreateCustomerFormValues } from '../CustomerForm';
import { localStorageService } from '@/lib/localStorageService';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewCustomerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: adminUserPerformingAction } = useAuth();

  const handleCreateCustomer = async (data: CreateCustomerFormValues) => {
     if (!adminUserPerformingAction) {
        toast({ title: "Authentication Error", variant: "destructive" });
        return;
     }
    try {
      const existingUser = localStorageService.findUserByEmail(data.email);
      if (existingUser) {
        toast({ title: "Creation Failed", description: "A customer with this email already exists.", variant: "destructive" });
        return;
      }
      const newUser = localStorageService.addUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });

      const logDescription = `Created user "${newUser.name || newUser.email}" (ID: ${newUser.id.substring(0,8)}) with role "${newUser.role}".`;
      await localStorageService.addAdminActionLog({
          adminId: adminUserPerformingAction.id,
          adminEmail: adminUserPerformingAction.email,
          actionType: 'USER_CREATE',
          entityType: 'User',
          entityId: newUser.id,
          description: logDescription
      });

      toast({ title: "Customer Created", description: `Customer "${data.name || data.email}" has been successfully added.` });
      router.push('/admin/customers');
    } catch (error) {
      console.error("Error creating customer:", error);
      toast({ title: "Error Creating Customer", description: "Could not create the customer. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/customers">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
        </Link>
      </Button>
      <CustomerForm onFormSubmit={handleCreateCustomer as any} isEditing={false} />
    </div>
  );
}
