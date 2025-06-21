
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import type { Job, ChatMessage } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, ArrowLeft, Frown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function JobChatPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId;

  const { currentUser } = useAuth();
  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { toast } = useToast();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const fetchMessages = useCallback(async () => {
    if (!jobId || !dataService) return;
    try {
      const fetchedMessages = await dataService.getChatForJob(jobId);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
    }
  }, [jobId, dataService, toast]);

  const fetchJobAndVerifyAccess = useCallback(async () => {
    if (!jobId || !currentUser || !dataService) {
      setIsLoading(true);
      return;
    }
    setIsLoading(true);
    setAccessError(null);
    try {
      const fetchedJob = await dataService.findJobById(jobId);
      if (!fetchedJob) {
        setAccessError("Job not found.");
      } else if (fetchedJob.createdById !== currentUser.id && fetchedJob.acceptedById !== currentUser.id) {
        setAccessError("You do not have permission to view this chat.");
      } else {
        setJob(fetchedJob);
        fetchMessages();
      }
    } catch (error) {
      setAccessError("An error occurred while loading job details.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [jobId, currentUser, dataService, fetchMessages]);

  useEffect(() => {
    if (!isDataSourceLoading) {
      fetchJobAndVerifyAccess();
    }
  }, [jobId, currentUser, isDataSourceLoading, fetchJobAndVerifyAccess]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (job && !accessError) {
        fetchMessages();
      }
    }, 5000); // Poll for new messages every 5 seconds
    return () => clearInterval(interval);
  }, [job, accessError, fetchMessages]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !jobId || !currentUser || !dataService || isSending) return;
    setIsSending(true);
    try {
      const sentMessage = await dataService.sendMessage(jobId, {
        senderId: currentUser.id,
        senderName: currentUser.name || currentUser.email,
        text: newMessage,
      });
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
    } catch (error) {
      toast({ title: "Error Sending Message", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || isDataSourceLoading) {
    return <div className="text-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /></div>;
  }

  if (accessError) {
    return (
      <div className="text-center py-20 space-y-4">
        <Frown className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="font-headline text-2xl text-destructive">{accessError}</h1>
        <Button asChild variant="outline"><Link href="/profile/jobs"><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Jobs</Link></Button>
      </div>
    );
  }

  if (!job) {
    return null; // Should be covered by loading/error state
  }

  return (
    <Card className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
      <CardHeader className="border-b">
        <CardTitle className="font-headline text-xl">{job.title}</CardTitle>
        <CardDescription>Chat between {job.createdByName} and {job.acceptedByName || 'N/A'}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        <ScrollArea className="h-full p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === currentUser?.id ? "justify-end" : "justify-start")}>
              {msg.senderId !== currentUser?.id && (
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://placehold.co/40x40.png?text=${msg.senderName.charAt(0)}`} alt={msg.senderName} data-ai-hint="user avatar" />
                    <AvatarFallback>{msg.senderName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              <div className={cn("max-w-xs md:max-w-md p-3 rounded-lg", msg.senderId === currentUser?.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <p className="text-sm">{msg.text}</p>
                <p className={cn("text-xs mt-1", msg.senderId === currentUser?.id ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                    {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                </p>
              </div>
              {msg.senderId === currentUser?.id && (
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://placehold.co/40x40.png?text=${msg.senderName.charAt(0)}`} alt={msg.senderName} data-ai-hint="user avatar" />
                    <AvatarFallback>{msg.senderName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-4 border-t">
        <div className="flex w-full items-center gap-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            rows={1}
            className="min-h-[40px] resize-none"
          />
          <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
