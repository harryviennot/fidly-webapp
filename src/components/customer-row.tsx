'use client';

import { useState } from 'react';
import { addStamp } from '@/api';
import { CustomerResponse } from '@/types';
import StampsDisplay from './stamps-display';

interface Props {
  customer: CustomerResponse;
  businessId: string;
  totalStamps: number;
  onStampAdded: (customerId: string, newStamps: number) => void;
}

export default function CustomerRow({ customer, businessId, totalStamps, onStampAdded }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddStamp = async () => {
    setIsLoading(true);
    try {
      const result = await addStamp(businessId, customer.id);
      onStampAdded(customer.id, result.stamps);
    } catch (error) {
      console.error('Failed to add stamp:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isMaxed = customer.stamps >= totalStamps;

  return (
    <tr>
      <td>{customer.name}</td>
      <td>{customer.email}</td>
      <td>
        <StampsDisplay count={customer.stamps} total={totalStamps} />
      </td>
      <td>
        <button
          className={`btn btn-primary btn-action ${isLoading ? 'loading' : ''}`}
          onClick={handleAddStamp}
          disabled={isLoading || isMaxed}
        >
          {isMaxed ? 'Max!' : 'Add Stamp'}
        </button>
      </td>
    </tr>
  );
}
