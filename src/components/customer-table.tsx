'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getAllCustomers, getActiveDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import { CustomerResponse } from '@/types';
import CustomerRow from './customer-row';

export default function CustomerTable() {
  const { currentBusiness } = useBusiness();
  const t = useTranslations('customers');
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [totalStamps, setTotalStamps] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!currentBusiness?.id) return;
    try {
      const [data, design] = await Promise.all([
        getAllCustomers(currentBusiness.id),
        getActiveDesign(currentBusiness.id),
      ]);
      setCustomers(data);
      if (design?.total_stamps) {
        setTotalStamps(design.total_stamps);
      }
      setError(null);
    } catch {
      setError(t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id, t]);

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
    return <div className="loading-state">{t('loading')}</div>;
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
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="empty-state">
          {searchTerm ? t('noResults') : t('empty')}
        </div>
      ) : (
        <table className="customer-table">
          <thead>
            <tr>
              <th>{t('table.name')}</th>
              <th>{t('table.email')}</th>
              <th>{t('table.stamps')}</th>
              <th>{t('table.action')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                businessId={currentBusiness!.id}
                totalStamps={totalStamps}
                onStampAdded={handleStampAdded}
              />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
