interface Props {
  count: number;
  max?: number;
}

export default function StampsDisplay({ count, max = 10 }: Props) {
  return (
    <div className="stamps-grid">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`stamp ${i < count ? 'filled' : ''}`}>
          ☕
        </span>
      ))}
    </div>
  );
}
