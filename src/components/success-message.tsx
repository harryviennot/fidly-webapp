import WalletButton from './wallet-button';

interface Props {
  customerName: string;
  passUrl: string;
}

export default function SuccessMessage({ customerName, passUrl }: Props) {
  return (
    <div className="success-message">
      <div className="success-icon">✓</div>
      <h2>Welcome, {customerName}!</h2>
      <p>Collect 10 stamps for a free coffee!</p>
      <WalletButton passUrl={passUrl} />
    </div>
  );
}
