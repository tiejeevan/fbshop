
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Barcode from 'react-barcode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Loader2, Printer, Mail, Truck, Info, CheckCircle } from 'lucide-react';
import { GeoapifyGeocoderAutocomplete, GeoapifyContext } from '@geoapify/react-geocoder-autocomplete';

type Address = {
    name: string;
    line1: string;
    line2: string;
    cityStateZip: string;
    country: string;
    phone?: string;
};

const initialFromAddress: Address = {
    name: 'Local Commerce Inc.',
    line1: '123 E-commerce Way',
    line2: 'Suite 101',
    cityStateZip: 'Silicon Valley, CA 94043',
    country: 'USA',
    phone: '555-0101',
};

const initialToAddress: Address = {
    name: '',
    line1: '',
    line2: '',
    cityStateZip: '',
    country: '',
    phone: '',
};

export default function ShippingLabelEnginePage() {
    const [fromAddress, setFromAddress] = useState<Address>(initialFromAddress);
    const [toAddress, setToAddress] = useState<Address>(initialToAddress);
    const [recipientPhone, setRecipientPhone] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isAddressSelected, setIsAddressSelected] = useState(false);

    const labelRef = useRef<HTMLDivElement>(null);
    const geoapifyApiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

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
            const body = `Hello,\n\nPlease find the shipping details for your order attached or printed.\n\nTracking Number: ${trackingNumber}\n\nShipping To:\n${toAddress.name || 'Recipient'}\n${toAddress.line1}\n${toAddress.line2 || ''}\n${toAddress.cityStateZip}\n${toAddress.country}\n\nThank you,\nLocal Commerce Team`;
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
    };

    const onPlaceSelect = (value: any) => {
        if (!value) {
            setToAddress(initialToAddress);
            setIsAddressSelected(false);
            return;
        }

        const props = value.properties;
        const name = props.name || props.street;

        setToAddress({
            name: name,
            line1: props.address_line1 || name,
            line2: props.address_line2 || '',
            cityStateZip: `${props.city || ''}, ${props.state_code || props.state || ''} ${props.postcode || ''}`.trim().replace(/^,|,$/g, ''),
            country: props.country || '',
            phone: recipientPhone,
        });
        setIsAddressSelected(true);
    };

    useEffect(() => {
        setToAddress(prev => ({...prev, phone: recipientPhone }));
    }, [recipientPhone]);

    return (
        <GeoapifyContext apiKey={geoapifyApiKey || ''}>
            <div className="space-y-6">
                <header>
                    <h1 className="font-headline text-3xl text-primary flex items-center gap-3">
                        <Truck /> Shipping Label Engine
                    </h1>
                    <p className="text-muted-foreground mt-1">Generate and print shipping labels using Geoapify for address autocomplete.</p>
                </header>

                 {!geoapifyApiKey && (
                    <Alert variant="destructive">
                        <Info className="h-4 w-4" />
                        <AlertTitle>API Key Missing</AlertTitle>
                        <AlertDescription>
                            The Geoapify API key is not configured. Please add `NEXT_PUBLIC_GEOAPIFY_API_KEY` to your `.env` file to enable address autocomplete. You can get a free key from <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer" className="underline">geoapify.com</a>.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid md:grid-cols-2 gap-8 items-start">
                    {/* --- INPUTS COLUMN --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Label Details</CardTitle>
                            <CardDescription>Enter the recipient's shipping information below.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="recipientAddress">Recipient Address Search</Label>
                                <GeoapifyGeocoderAutocomplete
                                    placeholder="Start typing an address..."
                                    onPlaceSelect={onPlaceSelect}
                                    onUserInput={(input) => {
                                        if (input === '') setIsAddressSelected(false);
                                    }}
                                    disabled={!geoapifyApiKey}
                                />
                            </div>

                             {isAddressSelected && (
                                <Alert variant="default" className="bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300 [&>svg]:text-green-700 dark:[&>svg]:text-green-300">
                                    <CheckCircle className="h-4 w-4"/>
                                    <AlertTitle>Address Selected</AlertTitle>
                                    <AlertDescription className="text-xs">
                                        <p className="font-semibold">{toAddress.name}</p>
                                        <p>{toAddress.line1}</p>
                                        <p>{toAddress.cityStateZip}, {toAddress.country}</p>
                                    </AlertDescription>
                                </Alert>
                            )}
                            
                            <div className="space-y-2">
                                <Label htmlFor="recipientPhone">Recipient Phone (Optional)</Label>
                                <Input 
                                    id="recipientPhone" 
                                    value={recipientPhone}
                                    onChange={(e) => setRecipientPhone(e.target.value)}
                                    placeholder="e.g., 555-123-4567"
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={handlePrint} className="flex-1" disabled={!isAddressSelected}><Printer className="mr-2 h-4 w-4"/> Print Label</Button>
                                <Button onClick={handleEmail} variant="outline" className="flex-1" disabled={!isAddressSelected}><Mail className="mr-2 h-4 w-4"/> Email Label</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* --- LABEL PREVIEW COLUMN --- */}
                    <div className="sticky top-20">
                        <h2 className="font-headline text-2xl text-center mb-4 no-print">Label Preview</h2>
                        <div
                            id="shipping-label"
                            ref={labelRef}
                            className={cn("bg-white text-black p-6 rounded-lg shadow-2xl aspect-[4/6] max-w-md mx-auto border-4 border-dashed border-gray-300 transition-all", !isAddressSelected && "opacity-50")}
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
                                    {isAddressSelected ? (
                                        <>
                                            <p className="text-lg font-semibold">{toAddress.name}</p>
                                            <p>{toAddress.line1}</p>
                                            {toAddress.line2 && <p>{toAddress.line2}</p>}
                                            <p className="font-semibold">{toAddress.cityStateZip}</p>
                                            <p className="font-bold">{toAddress.country.toUpperCase()}</p>
                                            {toAddress.phone && <p className="text-sm">Ph: {toAddress.phone}</p>}
                                        </>
                                    ) : (
                                        <div className="text-muted-foreground text-sm italic">Select an address to preview details here.</div>
                                    )}
                               </div>
                           </div>
                           <div className="border-t-4 border-black mt-4 pt-2 text-center flex flex-col items-center">
                               <p className="text-xs font-bold">LOCAL COMMERCE TRACKING #</p>
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
                                    <p className="text-2xl font-semibold">{toAddress.name}</p>
                                    <p className="text-xl">{toAddress.line1}</p>
                                    {toAddress.line2 && <p className="text-xl">{toAddress.line2}</p>}
                                    <p className="text-xl font-semibold">{toAddress.cityStateZip}</p>
                                    <p className="text-xl font-bold">{toAddress.country.toUpperCase()}</p>
                                    {toAddress.phone && <p className="text-lg">Ph: {toAddress.phone}</p>}
                               </div>
                           </div>
                           <div className="border-t-4 border-black mt-auto pt-4 text-center flex flex-col items-center">
                               <p className="text-lg font-bold">LOCAL COMMERCE TRACKING #</p>
                               {trackingNumber && (
                                    <Barcode value={trackingNumber} width={3} height={100} fontSize={20} />
                               )}
                           </div>
                        </div>
                    </div>
                </div>
            </div>
        </GeoapifyContext>
    );
}
