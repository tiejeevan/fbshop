
'use client';

import React from 'react';
import { CustomerForm, type CreateCustomerFormValues } from '../CustomerForm';
import { localStorageService } from '@/lib/localStorage';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewCustomerPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateCustomer = async (data: CreateCustomerFormValues) => {
    try {
      const existingUser = localStorageService.findUserByEmail(data.email);
      if (existingUser) {
        toast({ title: "Creation Failed", description: "A customer with this email already exists.", variant: "destructive" });
        return;
      }
      localStorageService.addUser({
        name: data.name,
        email: data.email,
        password: data.password, // Password is required by CreateCustomerFormValues
        role: data.role,
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
