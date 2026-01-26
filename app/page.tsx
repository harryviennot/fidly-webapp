'use client';

import { useState } from 'react';
import RegistrationForm from '@/components/registration-form';
import SuccessMessage from '@/components/success-message';
import { CustomerResponse } from '@/lib/types';

export default function Home() {
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div className="logo">☕</div>
          <h1>Coffee Shop</h1>
          <p className="subtitle">Get your digital loyalty card</p>
        </div>

        {customer ? (
          <SuccessMessage
            customerName={customer.name}
            passUrl={customer.pass_url}
          />
        ) : (
          <RegistrationForm onSuccess={setCustomer} />
        )}

        <div className="footer">Powered by Apple Wallet</div>
      </div>
    </div>
  );
}
