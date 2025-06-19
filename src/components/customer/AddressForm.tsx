
'use client';

import React from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'; // Dialog parts for modal usage
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { Address } from '@/types';

const addressSchema = z.object({
  recipientName: z.string().min(2, 'Recipient name is required'),
  addressLine1: z.string().min(5, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  stateOrProvince: z.string().min(2, 'State or province is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
  phoneNumber: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  initialData?: Address | null;
  onSubmit: (data: AddressFormValues, addressId?: string) => void;
  onCancel?: () => void; // For closing modal
  isSubmitting: boolean;
  submitButtonText?: string;
}

export function AddressForm({ initialData, onSubmit, onCancel, isSubmitting, submitButtonText = 'Save Address' }: AddressFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: initialData || {
      recipientName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateOrProvince: '',
      postalCode: '',
      country: '',
      phoneNumber: '',
      isDefault: false,
    },
  });

  const processSubmit: SubmitHandler<AddressFormValues> = (data) => {
    onSubmit(data, initialData?.id);
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)}>
      <DialogHeader className="mb-4">
        <DialogTitle className="font-headline text-xl">{initialData ? 'Edit Address' : 'Add New Address'}</DialogTitle>
        <DialogDescription>
          {initialData ? 'Update your shipping address details.' : 'Enter your shipping address details.'}
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-2 pb-6 max-h-[60vh] overflow-y-auto px-1">
        <div>
          <Label htmlFor="recipientName">Recipient Name</Label>
          <Input id="recipientName" {...register('recipientName')} placeholder="e.g. John Doe" />
          {errors.recipientName && <p className="text-sm text-destructive mt-1">{errors.recipientName.message}</p>}
        </div>
        <div>
          <Label htmlFor="addressLine1">Address Line 1</Label>
          <Input id="addressLine1" {...register('addressLine1')} placeholder="e.g. 123 Main St" />
          {errors.addressLine1 && <p className="text-sm text-destructive mt-1">{errors.addressLine1.message}</p>}
        </div>
        <div>
          <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
          <Input id="addressLine2" {...register('addressLine2')} placeholder="e.g. Apt #100" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register('city')} placeholder="e.g. Anytown" />
            {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
          </div>
          <div>
            <Label htmlFor="stateOrProvince">State / Province</Label>
            <Input id="stateOrProvince" {...register('stateOrProvince')} placeholder="e.g. CA" />
            {errors.stateOrProvince && <p className="text-sm text-destructive mt-1">{errors.stateOrProvince.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input id="postalCode" {...register('postalCode')} placeholder="e.g. 90210" />
            {errors.postalCode && <p className="text-sm text-destructive mt-1">{errors.postalCode.message}</p>}
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register('country')} placeholder="e.g. USA" />
            {errors.country && <p className="text-sm text-destructive mt-1">{errors.country.message}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
          <Input id="phoneNumber" {...register('phoneNumber')} type="tel" placeholder="e.g. 555-123-4567" />
        </div>
        <div className="flex items-center space-x-2">
          <Controller
            name="isDefault"
            control={control}
            render={({ field }) => (
              <Switch
                id="isDefaultAddress"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="isDefaultAddress">Set as default shipping address</Label>
        </div>
      </div>

      <DialogFooter className="mt-6">
        {onCancel && <DialogClose asChild><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></DialogClose>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitButtonText}
        </Button>
      </DialogFooter>
    </form>
  );
}
    