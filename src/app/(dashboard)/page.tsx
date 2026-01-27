"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UsersIcon, PaletteIcon, UserPlusIcon, StampIcon } from "@phosphor-icons/react";
import { StatsCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusiness } from "@/contexts/business-context";
import { getAllCustomers, getActiveDesign } from "@/api";
import type { CustomerResponse, CardDesign } from "@/types";

export default function AdminPage() {
  const { currentBusiness, memberships } = useBusiness();
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [activeDesign, setActiveDesign] = useState<CardDesign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!currentBusiness?.id) return;

      setLoading(true);
      try {
        const [customersData, designData] = await Promise.all([
          getAllCustomers(currentBusiness.id),
          getActiveDesign(currentBusiness.id),
        ]);
        setCustomers(customersData);
        setActiveDesign(designData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentBusiness?.id]);

  const totalStamps = customers.reduce((sum, c) => sum + c.stamps, 0);
  const currentMembership = memberships.find(
    (m) => m.business.id === currentBusiness?.id
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-bold">
          Welcome back, {currentBusiness?.name}
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your loyalty program
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Customers"
          value={customers.length}
          description="Registered customers"
          icon={<UsersIcon className="h-6 w-6" weight="duotone" />}
        />
        <StatsCard
          title="Total Stamps"
          value={totalStamps}
          description="Stamps collected"
          icon={<StampIcon className="h-6 w-6" weight="duotone" />}
        />
        <StatsCard
          title="Active Design"
          value={activeDesign ? "1" : "0"}
          description={activeDesign?.name || "No active design"}
          icon={<PaletteIcon className="h-6 w-6" weight="duotone" />}
        />
        <StatsCard
          title="Team Members"
          value={memberships.length}
          description={`You are ${currentMembership?.role || "member"}`}
          icon={<UserPlusIcon className="h-6 w-6" weight="duotone" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/customers">View Customers</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/design">Manage Designs</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/team">Manage Team</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No customers yet. Share your loyalty program to get started!
              </p>
            ) : (
              <div className="space-y-3">
                {customers.slice(0, 5).map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.email}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {customer.stamps} stamps
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
