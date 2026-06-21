export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="w-8 h-8 border-2 border-rule border-t-green rounded-full animate-spin" />
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-risk text-sm">{message}</div>
  );
}
