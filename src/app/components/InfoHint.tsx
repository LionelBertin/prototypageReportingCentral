import { Info } from 'lucide-react';

type InfoHintProps = {
  text?: string;
  className?: string;
};

export function InfoHint({ text, className }: InfoHintProps) {
  const trimmed = text?.trim();
  if (!trimmed) return null;

  return (
    <span
      title={trimmed}
      aria-label={trimmed}
      className={className ?? 'inline-flex items-center text-gray-400 hover:text-gray-600'}
    >
      <Info className="size-3.5" />
    </span>
  );
}
