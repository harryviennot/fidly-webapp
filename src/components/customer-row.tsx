'use client';

import { useState } from 'react';
import { addStamp } from '@/api';
import { CustomerResponse } from '@/types';
import StampsDisplay from './stamps-display';

interface Props {
  customer: CustomerResponse;
  onStampAdded: (customerId: string, newStamps: number) => void;
}

export default function CustomerRow({ customer, onStampAdded }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddStamp = async () => {
    setIsLoading(true);
    try {
      const result = await addStamp(customer.id);
      onStampAdded(customer.id, result.stamps);
    } catch (error) {
      console.error('Failed to add stamp:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <tr>
      <td>{customer.name}</td>
      <td>{customer.email}</td>
      <td>
        <StampsDisplay count={customer.stamps} />
      </td>
      <td>
        <button
          className={`btn btn-primary btn-action ${isLoading ? 'loading' : ''}`}
          onClick={handleAddStamp}
          disabled={isLoading || customer.stamps >= 10}
        >
          {customer.stamps >= 10 ? 'Max!' : 'Add Stamp'}
        </button>
      </td>
    </tr>
  );
}
