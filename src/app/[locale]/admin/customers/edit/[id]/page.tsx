
'use client';

import React, { useEffect, useState, use } from 'react';
import { CustomerForm, type EditCustomerFormValues } from '../../CustomerForm';
import { localStorageService } from '@/lib/localStorageService';
import type { User } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Helper to generate detailed change descriptions for users
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

export default function EditCustomerPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [customer, setCustomer] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: adminUserPerformingAction, refreshUser } = useAuth();


  useEffect(() => {
    const fetchedCustomer = localStorageService.findUserById(params.id);
    if (fetchedCustomer) {
      setCustomer(fetchedCustomer);
    } else {
      toast({ title: "Customer Not Found", description: "The customer you are trying to edit does not exist.", variant: "destructive" });
      router.push('/admin/customers');
    }
    setIsLoading(false);
  }, [params.id, router, toast]);

  const handleEditCustomer = async (data: EditCustomerFormValues, id?: string) => {
    if (!id || !customer || !adminUserPerformingAction) {
        toast({ title: "Error", description: "Missing data or admin session.", variant: "destructive" });
        return;
    }

    const oldUserSnapshot = { ...customer };

    if (data.email !== customer.email) {
        const existingUserWithNewEmail = localStorageService.findUserByEmail(data.email);
        if (existingUserWithNewEmail && existingUserWithNewEmail.id !== id) {
            toast({ title: "Update Failed", description: "Another customer with this email already exists.", variant: "destructive" });
            return;
        }
    }

    try {
      const updatedCustomerData: User = {
        ...customer,
        name: data.name,
        email: data.email,
        role: data.role,
        // Only update password if a new one is provided and is not empty
        password: (data.password && data.password.length > 0) ? data.password : customer.password,
        updatedAt: new Date().toISOString(), // Add/update timestamp
      };
      localStorageService.updateUser(updatedCustomerData);

      const logDescription = generateUserChangeDescription(oldUserSnapshot, data);
      await localStorageService.addAdminActionLog({
          adminId: adminUserPerformingAction.id,
          adminEmail: adminUserPerformingAction.email,
          actionType: 'USER_UPDATE',
          entityType: 'User',
          entityId: id,
          description: logDescription
      });

      toast({ title: "Customer Updated", description: `Customer "${data.name || data.email}" has been successfully updated.` });

      if (adminUserPerformingAction && adminUserPerformingAction.id === id) {
        refreshUser();
      }
      router.push('/admin/customers');

    } catch (error) {
      console.error("Error updating customer:", error);
      toast({ title: "Error Updating Customer", description: "Could not update the customer. Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading customer data...</div>;
  }

  if (!customer) {
    return <div className="text-center py-10 text-destructive">Customer not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/customers">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
        </Link>
      </Button>
      <CustomerForm initialData={customer} onFormSubmit={handleEditCustomer as any} isEditing={true} />
    </div>
  );
}
    
