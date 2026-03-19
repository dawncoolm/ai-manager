interface StatusDotProps {
  status: "active" | "inactive" | "partial";
}

const colors = {
  active: "bg-emerald-500",
  inactive: "bg-gray-300",
  partial: "bg-amber-400",
};

export default function StatusDot({ status }: StatusDotProps) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />
  );
}
