'use client';

interface StampsDisplayProps {
  count: number;
  total?: number;
}

export default function StampsDisplay({ count, total = 10 }: StampsDisplayProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full ${
            i < count
              ? 'bg-orange-500'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {count}/{total}
      </span>
    </div>
  );
}
