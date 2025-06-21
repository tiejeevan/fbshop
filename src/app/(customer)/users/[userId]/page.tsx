
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { User, JobReview } from '@/types';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, UserCircle, Star, Frown, Award, Medal, Briefcase, PlusCircle, Wrench, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { StarRatingDisplay } from '@/components/product/StarRatingDisplay';
import { JobReviewList } from '@/components/jobs/JobReviewList';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const badgeConfig: { [key: string]: { icon: React.ElementType, label: string, description: string } } = {
  'first-job-done': { icon: Medal, label: "First Job Done", description: "Completed their first job." },
  'community-star': { icon: Award, label: "Community Star", description: "Completed 5 or more jobs." },
  'top-rated': { icon: Star, label: "Top Rated", description: "Maintains a 4.5+ average rating." },
};

export default function UserProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;

  const { dataService, isLoading: isDataSourceLoading } = useDataSource();
  const { toast } = useToast();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<JobReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    if (!userId || isDataSourceLoading || !dataService) {
      return;
    }
    setIsLoading(true);
    try {
      // Data service findUserById now calculates badges and job stats
      const [fetchedUser, fetchedReviews] = await Promise.all([
        dataService.findUserById(userId),
        dataService.getReviewsAboutUser(userId)
      ]);
      
      if (fetchedUser) {
        setUser(fetchedUser);
        setReviews(fetchedReviews);
      } else {
        toast({ title: "User Not Found", variant: "destructive" });
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user profile data:", error);
      toast({ title: "Error", description: "Could not load user profile.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [userId, dataService, isDataSourceLoading, toast]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  if (isLoading || isDataSourceLoading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading Profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 space-y-4">
        <Frown className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="font-headline text-2xl text-destructive">User Not Found</h1>
        <p className="text-muted-foreground">The profile you are looking for does not exist.</p>
        <Button onClick={() => router.back()} variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
       <Button variant="outline" onClick={() => router.back()} className="group">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back
        </Button>
        
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                 <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage src={`https://placehold.co/100x100.png?text=${user.name?.charAt(0)}`} alt={user.name} data-ai-hint="user avatar" />
                    <AvatarFallback className="text-4xl">{user.name ? user.name.charAt(0).toUpperCase() : <UserCircle />}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <CardTitle className="font-headline text-4xl text-primary">{user.name || 'User'}</CardTitle>
                    <CardDescription>Member since {format(new Date(user.createdAt), 'MMMM yyyy')}</CardDescription>
                     {user.badges && user.badges.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-2">
                             <TooltipProvider>
                                {user.badges.map(badgeKey => {
                                    const config = badgeConfig[badgeKey];
                                    if (!config) return null;
                                    return (
                                        <Tooltip key={badgeKey}>
                                            <TooltipTrigger asChild>
                                                <Badge variant="secondary" className="cursor-default text-sm">
                                                    <config.icon className="h-4 w-4 mr-1.5" />
                                                    {config.label}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{config.description}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </TooltipProvider>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                 <div className="border-t mt-4 pt-4 flex flex-wrap justify-around items-center bg-muted/50 p-4 rounded-lg gap-4">
                    <div className="text-center">
                        <p className="font-headline text-3xl text-primary">{user.jobsCreatedCount ?? 0}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5"><PlusCircle className="h-4 w-4"/>Jobs Created</p>
                    </div>
                     <div className="text-center">
                        <p className="font-headline text-3xl text-primary">{user.jobsCompletedCount ?? 0}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5"><CheckCircle className="h-4 w-4"/>Jobs Completed</p>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                            <p className="font-headline text-3xl text-amber-500">{user.averageJobRating?.toFixed(1) || '0.0'}</p>
                            <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                        </div>
                        <p className="text-sm text-muted-foreground">Average Rating ({user.jobReviewCount || 0})</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        {user.skills && user.skills.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2">
                        <Wrench /> Skills
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {user.skills.map(skill => (
                            <Badge key={skill} variant="outline" className="text-base">{skill}</Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )}

        <div>
            <h2 className="font-headline text-2xl text-primary mb-4">Reviews Received</h2>
            <JobReviewList reviews={reviews} />
        </div>
    </div>
  );
}
