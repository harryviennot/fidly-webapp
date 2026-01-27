"use client";

import CustomerTable from "@/components/customer-table";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Customers</h2>
        <p className="text-muted-foreground">
          View and manage your loyalty program customers
        </p>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <CustomerTable />
      </div>
    </div>
  );
}
