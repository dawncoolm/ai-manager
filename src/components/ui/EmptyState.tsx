import { PackageOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function EmptyState({
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12">
      <PackageOpen className="h-10 w-10 text-gray-300" />
      <p className="mt-3 text-sm font-medium text-gray-600">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
