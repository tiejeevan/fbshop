
'use client';

import React, { useEffect, useState, use } from 'react';
import { CustomerForm, type EditCustomerFormValues } from '../../CustomerForm';
import { localStorageService } from '@/lib/localStorage';
import type { User } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EditCustomerPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [customer, setCustomer] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

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
    if (!id || !customer) return;

    // Check if email is being changed and if the new email already exists for another user
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
        // Only update password if a new one is provided
        password: data.password ? data.password : customer.password,
      };
      localStorageService.updateUser(updatedCustomerData);
      toast({ title: "Customer Updated", description: `Customer "${data.name || data.email}" has been successfully updated.` });
      router.push('/admin/customers');
       // If current user is the one being edited, refresh auth context to reflect changes
      const sessionUser = localStorageService.getCurrentUser();
      if (sessionUser && sessionUser.id === id) {
        localStorageService.setCurrentUser(updatedCustomerData); // Update session
        // Potentially trigger a global state update if your AuthContext listens for it
      }
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
