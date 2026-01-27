'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllCustomers } from '@/lib/api';
import { useBusiness } from '@/lib/context/business-context';
import { CustomerResponse } from '@/lib/types';
import CustomerRow from './customer-row';

export default function CustomerTable() {
  const { currentBusiness } = useBusiness();
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!currentBusiness?.id) return;
    try {
      const data = await getAllCustomers(currentBusiness.id);
      setCustomers(data);
      setError(null);
    } catch (err) {
      setError('Failed to load customers. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleStampAdded = (customerId: string, newStamps: number) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, stamps: newStamps } : c))
    );
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  if (isLoading) {
    return <div className="loading-state">Loading customers...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <>
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="empty-state">
          {searchTerm ? 'No customers found matching your search.' : 'No customers yet.'}
        </div>
      ) : (
        <table className="customer-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Stamps</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onStampAdded={handleStampAdded}
              />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
