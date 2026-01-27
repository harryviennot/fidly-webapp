import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">{title}</p>
            <p className="text-3xl font-bold mt-1 text-[var(--foreground)]">{value}</p>
            {description && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{description}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
