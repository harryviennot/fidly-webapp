'use client';

import { useBusiness } from '@/contexts/business-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPinIcon, PlusIcon, Crown } from '@phosphor-icons/react';

interface LocationsSectionProps {
  embedded?: boolean;
}

export function LocationsSection({ embedded = false }: LocationsSectionProps) {
  const { currentBusiness } = useBusiness();
  const isProPlan = currentBusiness?.subscription_tier === 'pro';

  const content = (
    <div className="space-y-6">
      {embedded && (
        <div className="mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            Locations
            {!isProPlan && (
              <Badge variant="secondary" className="text-xs font-normal">
                <Crown className="h-3 w-3 mr-1 text-amber-500" />
                Pro Feature
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Add your business locations for proximity notifications
          </p>
        </div>
      )}

      {isProPlan ? (
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <MapPinIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h4 className="font-medium mb-1">No locations added yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add your store locations to enable location-based notifications
            </p>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            When customers are near your location, they&apos;ll receive a reminder notification about their loyalty card.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-lg p-6 bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Crown className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Upgrade to Pro</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Location-based notifications help bring customers back to your store when they&apos;re nearby.
                </p>
                <Button variant="outline" size="sm">
                  View Pro Features
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return <div className="p-6">{content}</div>;
  }

  return (
    <Card id="locations" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Locations
          {!isProPlan && (
            <Badge variant="secondary" className="text-xs font-normal">
              <Crown className="h-3 w-3 mr-1 text-amber-500" />
              Pro Feature
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Add your business locations for proximity notifications
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
