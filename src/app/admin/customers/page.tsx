
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, UserX } from 'lucide-react';
import { localStorageService } from '@/lib/localStorage';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customerToDelete, setCustomerToDelete] = useState<User | null>(null);
  const { toast } = useToast();

  const fetchCustomers = useCallback(() => {
    setIsLoading(true);
    const allUsers = localStorageService.getUsers();
    const fetchedCustomers = allUsers.filter(user => user.role === 'customer');
    setCustomers(fetchedCustomers);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;
    
    // Check if customer has orders or cart, ideally this logic would be more robust.
    // For now, we'll just delete the user. Associated data like cart/orders might become orphaned.
    const success = localStorageService.deleteUser(customerToDelete.id);
    if (success) {
      toast({ title: "Customer Deleted", description: `User "${customerToDelete.name || customerToDelete.email}" has been successfully deleted.` });
      fetchCustomers(); // Refresh list
      // Also clear any cart for this user.
      localStorageService.clearCart(customerToDelete.id);
    } else {
      toast({ title: "Error Deleting Customer", description: "Could not delete the customer. Please try again.", variant: "destructive" });
    }
    setCustomerToDelete(null); // Close dialog
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading customer data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl text-primary">Customer Management</h1>
          <p className="text-muted-foreground">View and manage customer accounts.</p>
        </div>
        {/* Placeholder for "Add Customer" if needed in future */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>A list of all registered customers.</CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-10">
              <UserX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No customers found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Joined On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name || 'N/A'}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {customer.createdAt ? format(new Date(customer.createdAt), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" /> View Details (Not Implemented)
                          </DropdownMenuItem> */}
                          <DropdownMenuItem 
                            onClick={() => setCustomerToDelete(customer)} 
                            className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {customerToDelete && (
        <AlertDialog open onOpenChange={() => setCustomerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the customer account
                for "{customerToDelete.name || customerToDelete.email}". Associated carts will be cleared.
                Order history will remain but may be less identifiable.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteCustomer} 
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Yes, delete customer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
