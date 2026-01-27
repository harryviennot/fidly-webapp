'use client';

import { useState, FormEvent } from 'react';
import { createCustomer } from '@/lib/api';
import { CustomerResponse } from '@/lib/types';

interface Props {
  businessId: string;
  onSuccess: (customer: CustomerResponse) => void;
}

export default function RegistrationForm({ businessId, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const customer = await createCustomer(businessId, { name, email });
      onSuccess(customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="name">Your Name</label>
        <input
          id="name"
          type="text"
          className="input"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          className="input"
          placeholder="john@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
        disabled={isLoading}
      >
        Get My Loyalty Card
      </button>
    </form>
  );
}
