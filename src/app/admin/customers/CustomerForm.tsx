
'use client';

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { User, UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const customerFormSchemaBase = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }).optional(),
  email: z.string().email({ message: 'Invalid email address' }),
  role: z.enum(['customer', 'admin']).default('customer'),
});

const createCustomerSchema = customerFormSchemaBase.extend({
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().min(6, { message: 'Please confirm your password' }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const editCustomerSchema = customerFormSchemaBase.extend({
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }).optional().or(z.literal('')),
  confirmPassword: z.string().min(6, { message: 'Please confirm your password' }).optional().or(z.literal('')),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match if new password is provided",
  path: ['confirmPassword'],
});

export type CreateCustomerFormValues = z.infer<typeof createCustomerSchema>;
export type EditCustomerFormValues = z.infer<typeof editCustomerSchema>;
export type CustomerFormValues = CreateCustomerFormValues | EditCustomerFormValues;


interface CustomerFormProps {
  initialData?: User | null;
  onFormSubmit: (data: CustomerFormValues, id?: string) => Promise<void>;
  isEditing?: boolean;
}

export function CustomerForm({ initialData, onFormSubmit, isEditing = false }: CustomerFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formSchema = isEditing ? editCustomerSchema : createCustomerSchema;

  const {
    register,
    handleSubmit,
    setValue,
    control, // for ShadCN Select
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          name: initialData.name || '',
          email: initialData.email,
          password: '', // Don't prefill password for editing
          confirmPassword: '',
          role: initialData.role || 'customer',
        }
      : {
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'customer',
        },
  });

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name || '');
      setValue('email', initialData.email);
      setValue('role', initialData.role || 'customer');
      // Passwords are intentionally not pre-filled for editing
    }
  }, [initialData, setValue]);

  const onSubmit: SubmitHandler<CustomerFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      await onFormSubmit(data, initialData?.id);
    } catch (error) {
      // Error is handled by onFormSubmit and toast is shown there
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{isEditing ? 'Edit Customer' : 'Create New Customer'}</CardTitle>
        <CardDescription>{isEditing ? 'Update the details of this customer.' : 'Fill in the form to add a new customer.'}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. John Doe" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" {...register('email')} placeholder="user@example.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
             <Controller
                name="role"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value as UserRole} defaultValue={initialData?.role || 'customer'}>
                        <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
            {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{isEditing ? 'New Password (Optional)' : 'Password'}</Label>
            <Input id="password" type="password" {...register('password')} placeholder="••••••••" />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
             {isEditing && <p className="text-xs text-muted-foreground">Leave blank to keep current password.</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{isEditing ? 'Confirm New Password' : 'Confirm Password'}</Label>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} placeholder="••••••••" />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/customers')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEditing ? 'Save Changes' : 'Create Customer'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
