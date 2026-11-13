// Initials avatar used where a person's photo would otherwise go.
// Deterministic tint per name so the same client always gets the same color.
const TINTS = [
  "bg-blue-100 text-blue-900",
  "bg-indigo-100 text-indigo-900",
  "bg-teal-100 text-teal-900",
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function tintFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}

interface MonogramProps {
  name: string;
  className?: string;
}

export function Monogram({ name, className = "" }: MonogramProps) {
  const label = name?.trim() || "";
  return (
    <div
      aria-hidden="true"
      className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm tracking-wide shrink-0 ${tintFor(label)} ${className}`}
    >
      {initialsOf(label)}
    </div>
  );
}
