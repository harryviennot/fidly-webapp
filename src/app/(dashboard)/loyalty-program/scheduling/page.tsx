'use client';

import { useLoyaltyProgram } from '../layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, PlusIcon, RocketLaunchIcon } from '@phosphor-icons/react';
import { ProFeatureGate } from '@/components/loyalty-program/ProFeatureGate';
import Link from 'next/link';

export default function SchedulingPage() {
  const { isProPlan } = useLoyaltyProgram();

  const schedulingContent = (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scheduling</h1>
          <p className="text-muted-foreground mt-1">
            Schedule card changes for campaigns and seasonal events
          </p>
        </div>
        <Button className="rounded-full" disabled={!isProPlan}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Schedule Change
        </Button>
      </div>

      {/* Scheduled changes card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Changes</CardTitle>
          <CardDescription>
            Scheduled card switches and campaign events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 border-2 border-dashed rounded-xl">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No scheduled changes</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              Schedule your card templates to automatically switch for holidays, special events, or marketing campaigns.
            </p>
            {isProPlan && (
              <Button variant="outline" className="rounded-full">
                <PlusIcon className="w-4 h-4 mr-2" />
                Schedule Your First Change
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Scheduling Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                <span className="font-bold text-[var(--accent)]">1</span>
              </div>
              <h4 className="font-medium">Choose a Card</h4>
              <p className="text-sm text-muted-foreground">
                Select which card template you want to activate
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                <span className="font-bold text-[var(--accent)]">2</span>
              </div>
              <h4 className="font-medium">Set the Dates</h4>
              <p className="text-sm text-muted-foreground">
                Pick start and end dates for the campaign
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                <span className="font-bold text-[var(--accent)]">3</span>
              </div>
              <h4 className="font-medium">Automatic Switch</h4>
              <p className="text-sm text-muted-foreground">
                Cards update automatically, no manual work needed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (!isProPlan) {
    return (
      <div className="space-y-6">
        {/* Page header always visible */}
        <div>
          <h1 className="text-2xl font-bold">Scheduling</h1>
          <p className="text-muted-foreground mt-1">
            Schedule card changes for campaigns and seasonal events
          </p>
        </div>

        {/* Pro gate */}
        <ProFeatureGate
          feature="Card Scheduling"
          description="Schedule your loyalty card templates to automatically switch for holidays, special events, or marketing campaigns. Perfect for seasonal promotions."
          isProPlan={isProPlan}
        >
          {schedulingContent}
        </ProFeatureGate>
      </div>
    );
  }

  return schedulingContent;
}
