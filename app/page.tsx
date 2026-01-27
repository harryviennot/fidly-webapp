'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RegistrationForm from '@/components/registration-form';
import SuccessMessage from '@/components/success-message';
import { CustomerResponse } from '@/lib/types';

function HomeContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business');
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);

  if (!businessId) {
    return (
      <div className="container">
        <div className="card">
          <div className="header">
            <div className="logo">☕</div>
            <h1>Loyalty Card</h1>
            <p className="subtitle">Missing business ID</p>
          </div>
          <p style={{ textAlign: 'center', color: '#666' }}>
            Please use a valid registration link from your business.
          </p>
        </div>
      </div>
    );
  }

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
          <RegistrationForm businessId={businessId} onSuccess={setCustomer} />
        )}

        <div className="footer">Powered by Apple Wallet</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="container">
          <div className="card">
            <div className="loading-state">Loading...</div>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
