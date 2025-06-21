
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Barcode from 'react-barcode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2, Printer, Mail, Truck, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { parseIndianAddress } from '@/ai/flows/parse-indian-address';
import type { IndianAddressOutput } from '@/ai/schemas/indian-address';
import { useToast } from '@/hooks/use-toast';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useAuth } from '@/hooks/useAuth';

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
    const [fromAddress] = useState<Address>(initialFromAddress);
    const [toAddress, setToAddress] = useState<Address>(initialToAddress);
    const [unstructuredAddress, setUnstructuredAddress] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isAddressParsed, setIsAddressParsed] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    
    const { toast } = useToast();
    const { dataService } = useDataSource();
    const { currentUser } = useAuth();
    const labelRef = useRef<HTMLDivElement>(null);

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
    
    const handleParseAddress = useCallback(async (addressToParse: string) => {
        if (!addressToParse.trim() || addressToParse.trim().length < 15) {
            return;
        }
        if (!currentUser || !dataService) return;
        setIsParsing(true);
        try {
            const result: IndianAddressOutput = await parseIndianAddress(addressToParse);
            if (!result || !result.city || !result.line1) {
                toast({ title: 'AI Parsing Failed', description: 'Could not parse the address. Please check the format or try rephrasing.', variant: 'destructive' });
                setToAddress(initialToAddress);
                setIsAddressParsed(false);
                await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: 'admin', actionType: 'AI_ADDRESS_PARSE_FAIL', description: 'AI failed to parse Indian address.', details: { input: addressToParse } });
                return;
            }
            setToAddress({
                name: result.name || '',
                line1: result.line1 || '',
                line2: result.line2 || '',
                cityStateZip: `${result.city || ''}, ${result.state || ''} ${result.postalCode || ''}`.trim().replace(/^,|,$/g, ''),
                country: result.country || 'India',
                phone: result.phoneNumber || '',
            });
            setIsAddressParsed(true);
            await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: 'admin', actionType: 'AI_ADDRESS_PARSE_SUCCESS', description: `AI successfully parsed Indian address for ${result.name || 'recipient'}.`, details: { input: addressToParse, output: result } });
        } catch (error) {
            console.error('Error parsing address:', error);
            toast({ title: 'AI Parsing Failed', description: 'Could not parse the address. Try rephrasing or check the format.', variant: 'destructive' });
            setToAddress(initialToAddress);
            setIsAddressParsed(false);
             if (currentUser && dataService) {
                await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: 'admin', actionType: 'AI_ADDRESS_PARSE_ERROR', description: 'An error occurred during AI address parsing.', details: { input: addressToParse, error: String(error) } });
            }
        } finally {
            setIsParsing(false);
        }
    }, [toast, currentUser, dataService]);

    useEffect(() => {
        if (!unstructuredAddress.trim()) {
            setToAddress(initialToAddress);
            setIsAddressParsed(false);
            return;
        }
        setIsAddressParsed(false); // Reset parsed state on new input
        const handler = setTimeout(() => {
            handleParseAddress(unstructuredAddress);
        }, 1500); // 1.5 second delay after user stops typing

        return () => {
            clearTimeout(handler);
        };
    }, [unstructuredAddress, handleParseAddress]);


    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-headline text-3xl text-primary flex items-center gap-3">
                    <Truck /> Shipping Label Engine
                </h1>
                <p className="text-muted-foreground mt-1">Enter an Indian address below. The AI will parse it automatically.</p>
            </header>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                <Card>
                    <CardHeader>
                        <CardTitle>Label Details</CardTitle>
                        <CardDescription>Enter the recipient's shipping information below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                           <div className="flex items-center justify-between">
                                <Label htmlFor="unstructuredAddress">Recipient Address (India)</Label>
                                {isParsing && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Parsing...</span>}
                                {isAddressParsed && !isParsing && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Parsed</span>}
                            </div>
                            <Textarea
                                id="unstructuredAddress"
                                placeholder="Paste the full unstructured address here. e.g., 'Anil Kumar, Flat 201, Green View Apartments, 12th Main Road, Indiranagar, Bangalore, Karnataka, 560038, Ph: 9876543210'"
                                value={unstructuredAddress}
                                onChange={(e) => setUnstructuredAddress(e.target.value)}
                                rows={5}
                            />
                        </div>
                        
                        <div className="flex gap-2 pt-4">
                            <Button onClick={handlePrint} className="flex-1" disabled={!isAddressParsed}>
                                <Printer className="mr-2 h-4 w-4"/> Print Label
                            </Button>
                            <Button onClick={handleEmail} variant="outline" className="flex-1" disabled={!isAddressParsed}>
                                <Mail className="mr-2 h-4 w-4"/> Email Label
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="sticky top-20">
                    <h2 className="font-headline text-2xl text-center mb-4 no-print">Label Preview</h2>
                    <div
                        id="shipping-label"
                        ref={labelRef}
                        className={cn("bg-white text-black p-6 rounded-lg shadow-2xl aspect-[4/6] max-w-md mx-auto border-4 border-dashed border-gray-300 transition-all", !isAddressParsed && "opacity-50")}
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
                                {isAddressParsed ? (
                                    <>
                                        <p className="text-lg font-semibold">{toAddress.name}</p>
                                        <p>{toAddress.line1}</p>
                                        {toAddress.line2 && <p>{toAddress.line2}</p>}
                                        <p className="font-semibold">{toAddress.cityStateZip}</p>
                                        <p className="font-bold">{toAddress.country.toUpperCase()}</p>
                                        {toAddress.phone && <p className="text-sm">Ph: {toAddress.phone}</p>}
                                    </>
                                ) : (
                                    <div className="text-muted-foreground text-sm italic py-4">
                                        {isParsing ? 'Parsing...' : 'The parsed address will appear here automatically.'}
                                    </div>
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
    );
}
