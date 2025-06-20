
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CustomerForm, type EditCustomerFormValues } from '../../CustomerForm';
import type { User } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDataSource } from '@/contexts/DataSourceContext';

const generateUserChangeDescription = (oldUser: User, newData: EditCustomerFormValues): string => {
  const changes: string[] = [];
  if ((oldUser.name || '') !== (newData.name || '')) {
    changes.push(`Name changed from "${oldUser.name || 'N/A'}" to "${newData.name || 'N/A'}".`);
  }
  if (oldUser.email !== newData.email) {
    changes.push(`Email changed from "${oldUser.email}" to "${newData.email}".`);
  }
  if (oldUser.role !== newData.role) {
    changes.push(`Role changed from "${oldUser.role}" to "${newData.role}".`);
  }
  if (newData.password && newData.password.length > 0) {
    changes.push('Password updated.');
  }

  if (changes.length === 0) {
    return `No significant changes detected for user "${newData.email}".`;
  }
  return `Updated user "${newData.email}": ${changes.join(' ')}`;
};

export default function EditCustomerPage({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: adminUserPerformingAction, refreshUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();


  const fetchCustomerData = useCallback(async (customerId: string) => {
    if (isDataSourceLoading || !dataService) {
        setIsLoading(true);
        return;
    }
    setIsLoading(true);
    try {
        const fetchedCustomer = await dataService.findUserById(customerId);
        if (fetchedCustomer) {
            setCustomer(fetchedCustomer);
        } else {
            toast({ title: "User Not Found", description: "The user you are trying to edit does not exist.", variant: "destructive" });
            router.push('/admin/customers');
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        toast({ title: "Error", description: "Could not load user data.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [dataService, isDataSourceLoading, router, toast]);

  useEffect(() => {
    if (params?.id) {
      fetchCustomerData(params.id);
    }
  }, [params, fetchCustomerData]);

  const handleEditCustomer = async (data: EditCustomerFormValues, id?: string) => {
    if (!id || !customer || !adminUserPerformingAction || !dataService) {
        toast({ title: "Error", description: "Missing data, admin session, or data service.", variant: "destructive" });
        return;
    }

    const oldUserSnapshot = { ...customer };

    if (data.email !== customer.email) {
        const existingUserWithNewEmail = await dataService.findUserByEmail(data.email);
        if (existingUserWithNewEmail && existingUserWithNewEmail.id !== id) {
            toast({ title: "Update Failed", description: "Another user with this email already exists.", variant: "destructive" });
            return;
        }
    }

    try {
      const updatedCustomerData: User = {
        ...customer,
        name: data.name || customer.name, // Keep old name if new is empty string from optional field
        email: data.email,
        role: data.role,
        password: (data.password && data.password.length > 0) ? data.password : customer.password,
        updatedAt: new Date().toISOString(), // Handled by service if it uses serverTimestamp
      };
      await dataService.updateUser(updatedCustomerData);

      const logDescription = generateUserChangeDescription(oldUserSnapshot, data);
      await dataService.addAdminActionLog({
          adminId: adminUserPerformingAction.id,
          adminEmail: adminUserPerformingAction.email,
          actionType: 'USER_UPDATE',
          entityType: 'User',
          entityId: id,
          description: logDescription
      });

      toast({ title: "User Updated", description: `User "${data.name || data.email}" has been successfully updated.` });

      if (adminUserPerformingAction && adminUserPerformingAction.id === id) {
        refreshUser(); // Refresh current admin's session if they edited themselves
      }
      router.push('/admin/customers');

    } catch (error) {
      console.error("Error updating customer:", error);
      toast({ title: "Error Updating User", description: "Could not update the user. Please try again.", variant: "destructive" });
    }
  };
  
  if (isLoading || isDataSourceLoading || !params?.id) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading user data...</div>;
  }

  if (!customer) {
    return <div className="text-center py-10 text-destructive">User not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/customers">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Link>
      </Button>
      <CustomerForm initialData={customer} onFormSubmit={handleEditCustomer as any} isEditing={true} />
    </div>
  );
}
