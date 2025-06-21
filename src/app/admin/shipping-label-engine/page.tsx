
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Barcode from 'react-barcode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Printer, Mail, Wand2, ArrowRight, Truck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type Address = {
    name: string;
    line1: string;
    line2: string;
    cityStateZip: string;
    country: string;
    phone?: string;
};

// This is a simplified type for the form, as the full ParseIndianAddressOutput is no longer needed.
type ToAddressForm = {
    recipientName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    phoneNumber: string;
}

const initialFromAddress: Address = {
    name: 'Local Commerce Inc.',
    line1: '123 E-commerce Way',
    line2: 'Suite 101',
    cityStateZip: 'Silicon Valley, CA 94043',
    country: 'USA',
    phone: '555-0101',
};

const initialToAddress: ToAddressForm = {
    recipientName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    phoneNumber: '',
};

export default function ShippingLabelEnginePage() {
    const [fromAddress, setFromAddress] = useState<Address>(initialFromAddress);
    const [toAddress, setToAddress] = useState<ToAddressForm>(initialToAddress);
    const [trackingNumber, setTrackingNumber] = useState('');

    const labelRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        generateTrackingNumber();
    }, []);

    const generateTrackingNumber = () => {
        const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase();
        setTrackingNumber(`LC${randomPart}`);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleEmail = () => {
        if (typeof window !== 'undefined') {
            const subject = `Shipping Label for Tracking #${trackingNumber}`;
            const body = `Hello,\n\nPlease find the shipping details for your order attached or printed.\n\nTracking Number: ${trackingNumber}\n\nShipping To:\n${toAddress.recipientName}\n${toAddress.addressLine1}\n${toAddress.addressLine2 || ''}\n${toAddress.city}, ${toAddress.state} ${toAddress.postalCode}\n\nThank you,\nLocal Commerce Team`;
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-headline text-3xl text-primary flex items-center gap-3">
                    <Truck /> Shipping Label Engine
                </h1>
                <p className="text-muted-foreground mt-1">Generate and print shipping labels by manually entering address details.</p>
            </header>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                {/* --- INPUTS COLUMN --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>Label Details</CardTitle>
                        <CardDescription>Enter the recipient's shipping information below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-medium text-lg">Recipient Address</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="toName">Recipient Name</Label>
                                    <Input id="toName" value={toAddress.recipientName || ''} onChange={e => setToAddress(p => ({...p, recipientName: e.target.value}))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="toPhone">Phone Number</Label>
                                    <Input id="toPhone" value={toAddress.phoneNumber || ''} onChange={e => setToAddress(p => ({...p, phoneNumber: e.target.value}))} />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="toLine1">Address Line 1</Label>
                                <Input id="toLine1" value={toAddress.addressLine1 || ''} onChange={e => setToAddress(p => ({...p, addressLine1: e.target.value}))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="toLine2">Address Line 2</Label>
                                <Input id="toLine2" value={toAddress.addressLine2 || ''} onChange={e => setToAddress(p => ({...p, addressLine2: e.target.value}))} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                 <div className="space-y-2">
                                    <Label htmlFor="toCity">City</Label>
                                    <Input id="toCity" value={toAddress.city || ''} onChange={e => setToAddress(p => ({...p, city: e.target.value}))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="toState">State</Label>
                                    <Input id="toState" value={toAddress.state || ''} onChange={e => setToAddress(p => ({...p, state: e.target.value}))} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="toZip">Postal Code</Label>
                                    <Input id="toZip" value={toAddress.postalCode || ''} onChange={e => setToAddress(p => ({...p, postalCode: e.target.value}))} />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button onClick={handlePrint} className="flex-1" disabled={!toAddress.recipientName || !toAddress.postalCode}><Printer className="mr-2 h-4 w-4"/> Print Label</Button>
                            <Button onClick={handleEmail} variant="outline" className="flex-1"><Mail className="mr-2 h-4 w-4"/> Email Label</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* --- LABEL PREVIEW COLUMN --- */}
                <div className="sticky top-20">
                    <h2 className="font-headline text-2xl text-center mb-4 no-print">Label Preview</h2>
                    <div
                        id="shipping-label"
                        ref={labelRef}
                        className="bg-white text-black p-6 rounded-lg shadow-2xl aspect-[4/6] max-w-md mx-auto border-4 border-dashed border-gray-300"
                    >
                       <div className="grid grid-cols-3 gap-4 border-b-4 border-black pb-2">
                           <div className="col-span-2">
                               <h3 className="font-bold text-lg">{fromAddress.name}</h3>
                               <p className="text-xs">{fromAddress.line1}</p>
                               <p className="text-xs">{fromAddress.cityStateZip}</p>
                           </div>
                           <div className="text-right">
                                <p className="text-xs font-semibold">SHIPPING DATE</p>
                                <p className="text-xs">{new Date().toLocaleDateString()}</p>
                                <p className="text-sm font-bold mt-1">STANDARD</p>
                           </div>
                       </div>
                       <div className="grid grid-cols-3 gap-4 mt-4">
                           <div className="col-span-1 border-r-2 border-black pr-2">
                                <p className="text-[8px] font-bold">SHIP FROM:</p>
                                <p className="text-[10px] leading-tight">{fromAddress.name}<br/>{fromAddress.line1}<br/>{fromAddress.line2}<br/>{fromAddress.cityStateZip}<br/>{fromAddress.country}</p>
                           </div>
                            <div className="col-span-2">
                                <p className="text-sm font-bold">SHIP TO:</p>
                                <p className="text-lg font-semibold">{toAddress.recipientName || 'Recipient Name'}</p>
                                <p>{toAddress.addressLine1 || 'Address Line 1'}</p>
                                {toAddress.addressLine2 && <p>{toAddress.addressLine2}</p>}
                                <p className="font-semibold">{toAddress.city || 'City'}, {toAddress.state || 'State'} {toAddress.postalCode || 'PIN'}</p>
                                <p className="font-bold">INDIA</p>
                                {toAddress.phoneNumber && <p className="text-sm">Ph: {toAddress.phoneNumber}</p>}
                           </div>
                       </div>
                       <div className="border-t-4 border-black mt-4 pt-2 text-center flex flex-col items-center">
                           <p className="text-xs font-bold">USPS TRACKING #</p>
                           {trackingNumber && (
                                <Barcode value={trackingNumber} width={2} height={50} fontSize={14} />
                           )}
                       </div>
                    </div>
                </div>
            </div>

            {/* Print-only version */}
            <div className="print-only hidden">
                <div
                    className="bg-white text-black p-6"
                    style={{width: '210mm', height: '297mm', boxSizing: 'border-box'}}
                >
                     <div
                        id="shipping-label-print"
                        className="bg-white text-black p-6 rounded-lg shadow-2xl border-4 border-dashed border-gray-300"
                        style={{width: '90%', height: '90%', margin: '5% auto', display: 'flex', flexDirection: 'column'}}
                    >
                       <div className="grid grid-cols-3 gap-4 border-b-4 border-black pb-2">
                           <div className="col-span-2">
                               <h3 className="font-bold text-xl">{fromAddress.name}</h3>
                               <p className="text-sm">{fromAddress.line1}</p>
                               <p className="text-sm">{fromAddress.cityStateZip}</p>
                           </div>
                           <div className="text-right">
                                <p className="text-sm font-semibold">SHIPPING DATE</p>
                                <p className="text-sm">{new Date().toLocaleDateString()}</p>
                                <p className="text-lg font-bold mt-1">STANDARD</p>
                           </div>
                       </div>
                       <div className="grid grid-cols-3 gap-4 mt-8 flex-grow">
                           <div className="col-span-1 border-r-2 border-black pr-4">
                                <p className="text-xs font-bold">SHIP FROM:</p>
                                <p className="text-sm leading-tight">{fromAddress.name}<br/>{fromAddress.line1}<br/>{fromAddress.line2}<br/>{fromAddress.cityStateZip}<br/>{fromAddress.country}</p>
                           </div>
                            <div className="col-span-2 pl-4">
                                <p className="text-lg font-bold">SHIP TO:</p>
                                <p className="text-2xl font-semibold">{toAddress.recipientName || 'Recipient Name'}</p>
                                <p className="text-xl">{toAddress.addressLine1 || 'Address Line 1'}</p>
                                {toAddress.addressLine2 && <p className="text-xl">{toAddress.addressLine2}</p>}
                                <p className="text-xl font-semibold">{toAddress.city || 'City'}, {toAddress.state || 'State'} {toAddress.postalCode || 'PIN'}</p>
                                <p className="text-xl font-bold">INDIA</p>
                                {toAddress.phoneNumber && <p className="text-lg">Ph: {toAddress.phoneNumber}</p>}
                           </div>
                       </div>
                       <div className="border-t-4 border-black mt-auto pt-4 text-center flex flex-col items-center">
                           <p className="text-lg font-bold">USPS TRACKING #</p>
                           {trackingNumber && (
                                <Barcode value={trackingNumber} width={3} height={100} fontSize={20} />
                           )}
                       </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
