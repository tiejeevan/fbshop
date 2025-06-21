
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { AdminActionLog } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Filter, ArrowLeft, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

const ITEMS_PER_PAGE = 15;
const ALL_FILTER_VALUE = "__ALL_LOG_FILTERS__";

export default function AdminLogsPage() {
  const [allLogs, setAllLogs] = useState<AdminActionLog[]>([]);
  const [isComponentLoading, setIsComponentLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterAdminEmail, setFilterAdminEmail] = useState('');
  const [filterActionType, setFilterActionType] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    if (isDataSourceLoading || !dataService) {
      setIsComponentLoading(true);
      return;
    }
    setIsComponentLoading(true);
    try {
      const fetchedLogs = await dataService.getAdminActionLogs();
      setAllLogs(fetchedLogs);
    } catch (error) {
      console.error("Failed to fetch admin logs:", error);
      toast({ title: "Error Fetching Logs", description: "Could not load admin activity logs.", variant: "destructive" });
      setAllLogs([]);
    }
    setIsComponentLoading(false);
  }, [dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const uniqueAdminEmails = useMemo(() => Array.from(new Set(allLogs.map(log => log.adminEmail))).sort(), [allLogs]);
  const uniqueActionTypes = useMemo(() => Array.from(new Set(allLogs.map(log => log.actionType))).sort(), [allLogs]);
  const uniqueEntityTypes = useMemo(() => Array.from(new Set(allLogs.map(log => log.entityType).filter(Boolean) as string[])).sort(), [allLogs]);

  const filteredLogs = useMemo(() => allLogs.filter(log => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      (filterAdminEmail === '' || log.adminEmail === filterAdminEmail) &&
      (filterActionType === '' || log.actionType === filterActionType) &&
      (filterEntityType === '' || log.entityType === filterEntityType) &&
      (searchTerm === '' || log.description.toLowerCase().includes(searchTermLower) || log.adminEmail.toLowerCase().includes(searchTermLower))
    );
  }), [allLogs, filterAdminEmail, filterActionType, filterEntityType, searchTerm]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = useMemo(() => filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  ), [filteredLogs, currentPage]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filterAdminEmail, filterActionType, filterEntityType, searchTerm]);


  if (isDataSourceLoading || isComponentLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />Loading logs...</div>;
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-headline text-3xl text-primary flex items-center">
            <FileText className="mr-3 h-7 w-7" /> Admin Action Logs
          </h1>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Review of actions performed by administrators. Using {dataService === null ? 'loading...' : (dataService as any)?.constructor?.name === 'localStorageDataService' ? 'Local Storage/IndexedDB' : 'Firebase Firestore'}.</CardDescription>
           <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center border-t pt-4">
            <div className="relative flex-grow w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            <Select
              value={filterAdminEmail === '' ? ALL_FILTER_VALUE : filterAdminEmail}
              onValueChange={(value) => setFilterAdminEmail(value === ALL_FILTER_VALUE ? '' : value)}
            >
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Admin..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All Admins</SelectItem>
                {uniqueAdminEmails.map(email => <SelectItem key={email} value={email}>{email}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={filterActionType === '' ? ALL_FILTER_VALUE : filterActionType}
              onValueChange={(value) => setFilterActionType(value === ALL_FILTER_VALUE ? '' : value)}
            >
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Action..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All Actions</SelectItem>
                {uniqueActionTypes.map(type => <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
             <Select
               value={filterEntityType === '' ? ALL_FILTER_VALUE : filterEntityType}
               onValueChange={(value) => setFilterEntityType(value === ALL_FILTER_VALUE ? '' : value)}
             >
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by Entity..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER_VALUE}>All Entities</SelectItem>
                {uniqueEntityTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setFilterAdminEmail(''); setFilterActionType(''); setFilterEntityType('');}} className="w-full sm:w-auto">
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedLogs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {allLogs.length === 0 ? "No logs found in the database." : "No logs found matching your criteria."}
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell className="text-xs">{log.adminEmail}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground">
                        {log.actionType.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.entityType && log.entityId ? (
                        <>
                          {log.entityType}: <span className="font-mono text-primary text-xs">{log.entityId.substring(0, 8)}...</span>
                        </>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{log.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({filteredLogs.length} total logs shown)
                </span>
                <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
                </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
