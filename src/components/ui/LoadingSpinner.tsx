import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-gray-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}
