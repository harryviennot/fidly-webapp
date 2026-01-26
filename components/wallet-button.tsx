interface Props {
  passUrl: string;
}

export default function WalletButton({ passUrl }: Props) {
  return (
    <a href={passUrl} className="wallet-btn">
      <img
        src="https://developer.apple.com/wallet/add-to-apple-wallet-guidelines/images/add-to-apple-wallet-logo.svg"
        alt="Add to Apple Wallet"
      />
    </a>
  );
}
