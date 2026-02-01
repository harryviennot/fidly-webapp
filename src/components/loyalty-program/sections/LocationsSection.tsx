'use client';

import { useState } from 'react';
import { useBusiness } from '@/contexts/business-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  Crown,
  MapTrifoldIcon,
} from '@phosphor-icons/react';

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_enabled: boolean;
  geofence_radius: number;
  is_primary: boolean;
}

// Placeholder data - will be fetched from API
const mockLocations: Location[] = [];

interface LocationsSectionProps {
  embedded?: boolean;
}

export function LocationsSection({ embedded = false }: LocationsSectionProps) {
  const { currentBusiness } = useBusiness();
  const [locations, setLocations] = useState<Location[]>(mockLocations);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
  });

  const isProPlan = currentBusiness?.subscription_tier === 'pro';
  const canAddMore = isProPlan || locations.length === 0;

  const handleAddLocation = () => {
    // TODO: Implement API call to create location
    const location: Location = {
      id: crypto.randomUUID(),
      name: newLocation.name,
      address: newLocation.address,
      latitude: 0,
      longitude: 0,
      geofence_enabled: false,
      geofence_radius: 100,
      is_primary: locations.length === 0,
    };
    setLocations([...locations, location]);
    setIsAddingLocation(false);
    setNewLocation({ name: '', address: '' });
  };

  const handleDeleteLocation = (id: string) => {
    // TODO: Implement API call to delete location
    setLocations(locations.filter((l) => l.id !== id));
  };

  const content = (
    <div className="space-y-4">
      {embedded && (
        <div className="mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            Locations
            {!isProPlan && (
              <Crown className="h-4 w-4 text-amber-500" weight="fill" />
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isProPlan
              ? 'Manage store locations and trigger notifications when customers are nearby'
              : 'Add your store location for location-based features'}
          </p>
        </div>
      )}
      {locations.length === 0 ? (
          <div className="bg-muted/50 border border-dashed border-muted-foreground/25 rounded-xl p-6 text-center">
            <MapTrifoldIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-4">
              No locations added yet
            </p>
            <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Location</DialogTitle>
                  <DialogDescription>
                    Add your store or business location
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="location-name">Location Name</Label>
                    <Input
                      id="location-name"
                      placeholder="Main Store"
                      value={newLocation.name}
                      onChange={(e) =>
                        setNewLocation({ ...newLocation, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-address">Address</Label>
                    <Input
                      id="location-address"
                      placeholder="123 Main Street, City"
                      value={newLocation.address}
                      onChange={(e) =>
                        setNewLocation({ ...newLocation, address: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingLocation(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLocation} disabled={!newLocation.name}>
                    Add Location
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <MapPinIcon className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {location.name}
                      {location.is_primary && (
                        <span className="ml-2 text-xs text-muted-foreground">(Primary)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{location.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isProPlan && (
                    <div className="flex items-center gap-2 mr-4">
                      <Label htmlFor={`geofence-${location.id}`} className="text-xs text-muted-foreground">
                        Geofencing
                      </Label>
                      <Switch
                        id={`geofence-${location.id}`}
                        checked={location.geofence_enabled}
                        onCheckedChange={() => {
                          // TODO: Implement geofencing toggle
                        }}
                      />
                    </div>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteLocation(location.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {canAddMore && (
              <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Another Location
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Location</DialogTitle>
                    <DialogDescription>
                      Add another store or business location
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="location-name">Location Name</Label>
                      <Input
                        id="location-name"
                        placeholder="Branch Store"
                        value={newLocation.name}
                        onChange={(e) =>
                          setNewLocation({ ...newLocation, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-address">Address</Label>
                      <Input
                        id="location-address"
                        placeholder="456 Other Street, City"
                        value={newLocation.address}
                        onChange={(e) =>
                          setNewLocation({ ...newLocation, address: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingLocation(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddLocation} disabled={!newLocation.name}>
                      Add Location
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {!isProPlan && locations.length >= 1 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 pt-2">
                <Crown className="h-3 w-3 text-amber-500" />
                Upgrade to Pro to add multiple locations and enable geofencing
              </p>
            )}
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Locations
              {!isProPlan && (
                <Crown className="h-4 w-4 text-amber-500" weight="fill" />
              )}
            </CardTitle>
            <CardDescription>
              {isProPlan
                ? 'Manage store locations and trigger notifications when customers are nearby'
                : 'Add your store location for location-based features'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
