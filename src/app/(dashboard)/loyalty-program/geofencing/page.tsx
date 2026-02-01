'use client';

import { useLoyaltyProgram } from '../layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPinIcon, PlusIcon, BellRingingIcon, ChartPieIcon, UsersFourIcon } from '@phosphor-icons/react';
import { ProFeatureGate } from '@/components/loyalty-program/ProFeatureGate';

export default function GeofencingPage() {
  const { isProPlan } = useLoyaltyProgram();

  const geofencingContent = (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Geofencing</h1>
          <p className="text-muted-foreground mt-1">
            Location-based notifications for your store locations
          </p>
        </div>
        <Button className="rounded-full" disabled={!isProPlan}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Locations card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store Locations</CardTitle>
          <CardDescription>
            Manage locations for proximity-based notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 border-2 border-dashed rounded-xl">
            <MapPinIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No locations added</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              Add your store locations to send notifications when customers are nearby.
            </p>
            {isProPlan && (
              <Button variant="outline" className="rounded-full">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Your First Location
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Geofencing Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <BellRingingIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Proximity Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Remind customers of their loyalty card when they&apos;re near your store
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <UsersFourIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Increase Visits</h4>
                <p className="text-sm text-muted-foreground">
                  Drive more foot traffic with timely, location-aware messages
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <ChartPieIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium">Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  Track which locations drive the most engagement
                </p>
              </div>
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
          <h1 className="text-2xl font-bold">Geofencing</h1>
          <p className="text-muted-foreground mt-1">
            Location-based notifications for your store locations
          </p>
        </div>

        {/* Pro gate */}
        <ProFeatureGate
          feature="Location Geofencing"
          description="Send automatic notifications when customers are near your store locations. Perfect for driving foot traffic and reminding customers about their loyalty rewards."
          isProPlan={isProPlan}
        >
          {geofencingContent}
        </ProFeatureGate>
      </div>
    );
  }

  return geofencingContent;
}
