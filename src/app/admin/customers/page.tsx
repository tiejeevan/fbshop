
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, UserX, Edit, PlusCircle } from 'lucide-react';
import { localStorageService } from '@/lib/localStorage';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth'; 
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
  const { currentUser: adminUserPerformingAction } = useAuth(); 

  const fetchCustomers = useCallback(() => {
    setIsLoading(true);
    const allUsers = localStorageService.getUsers();
    const fetchedCustomers = allUsers.filter(user => user.role === 'customer' || user.role === 'admin'); 
    setCustomers(fetchedCustomers);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDeleteCustomer = async () => {
    if (!customerToDelete || !adminUserPerformingAction) {
      toast({ title: "Action Denied", description: "Cannot delete user without proper authorization or selection.", variant: "destructive" });
      setCustomerToDelete(null);
      return;
    }
    if (adminUserPerformingAction && customerToDelete.id === adminUserPerformingAction.id) {
      toast({ title: "Action Denied", description: "You cannot delete your own admin account.", variant: "destructive" });
      setCustomerToDelete(null);
      return;
    }
    
    const success = localStorageService.deleteUser(customerToDelete.id);
    if (success) {
      await localStorageService.addAdminActionLog({
          adminId: adminUserPerformingAction.id,
          adminEmail: adminUserPerformingAction.email,
          actionType: 'USER_DELETE',
          entityType: 'User',
          entityId: customerToDelete.id,
          description: `Deleted user "${customerToDelete.name || customerToDelete.email}" (ID: ${customerToDelete.id.substring(0,8)}...).`
      });
      toast({ title: "User Deleted", description: `User "${customerToDelete.name || customerToDelete.email}" has been successfully deleted.` });
      fetchCustomers(); 
      localStorageService.clearCart(customerToDelete.id); 
    } else {
      toast({ title: "Error Deleting User", description: "Could not delete the user. Please try again.", variant: "destructive" });
    }
    setCustomerToDelete(null); 
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading customer data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl text-primary">User Management</h1>
          <p className="text-muted-foreground">View, create, edit, and delete user accounts.</p>
        </div>
        <Button asChild>
          <Link href="/admin/customers/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New User
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>A list of all registered users (customers and admins).</CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-10">
              <UserX className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found.</p>
                 <Button asChild variant="secondary" className="mt-4">
                    <Link href="/admin/customers/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add User
                    </Link>
                </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Joined On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name || 'N/A'}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            customer.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-300'
                        }`}>
                            {customer.role.charAt(0).toUpperCase() + customer.role.slice(1)}
                        </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {customer.createdAt ? format(new Date(customer.createdAt), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem asChild>
                              <Link href={`/admin/customers/edit/${customer.id}`} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setCustomerToDelete(customer)} 
                            className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
                            disabled={adminUserPerformingAction?.id === customer.id} 
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
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
                This action cannot be undone. This will permanently delete the user account
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
                Yes, delete user
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
