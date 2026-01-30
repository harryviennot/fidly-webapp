"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-provider";
import { useBusiness } from "@/contexts/business-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StampeoLogo } from "@/components/ui/stampeo-logo";
import { DeviceMobileIcon, CheckCircleIcon } from "@phosphor-icons/react";

export default function ScannerWelcomePage() {
  const { signOut } = useAuth();
  const { currentRole, currentBusiness, loading } = useBusiness();

  // If user is not a scanner, redirect them to dashboard
  useEffect(() => {
    if (!loading && currentRole && currentRole !== "scanner") {
      window.location.href = "/";
    }
  }, [loading, currentRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <StampeoLogo className="h-8" />
          </div>
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="h-10 w-10 text-green-600" weight="fill" />
          </div>
          <CardTitle className="text-green-600">You're All Set!</CardTitle>
          <CardDescription>
            {currentBusiness ? (
              <>
                You've joined <span className="font-semibold">{currentBusiness.name}</span> as a scanner.
              </>
            ) : (
              "You've been set up as a scanner."
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-gray-100 rounded-lg p-6 text-center">
            <DeviceMobileIcon className="h-12 w-12 mx-auto mb-3 text-gray-600" />
            <h3 className="font-medium mb-2">Download the Scanner App</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use the Stampeo Scanner app to scan customer passes and add stamps.
            </p>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" disabled>
                App Store (Coming Soon)
              </Button>
              <Button variant="outline" className="w-full" disabled>
                Google Play (Coming Soon)
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>The scanner app is currently in development.</p>
            <p>You'll be notified when it's available.</p>
          </div>

          <Button
            variant="ghost"
            onClick={() => signOut()}
            className="w-full text-gray-600"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
