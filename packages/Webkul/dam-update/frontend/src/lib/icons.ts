import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Resolve a category's stored icon name to a lucide-react component.
 * Backend seeds kebab-case lucide names, e.g. "brain-circuit" -> BrainCircuit.
 */
export function resolveLucideIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Icons.Layers;
  const key = name
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const icon = (Icons as unknown as Record<string, LucideIcon>)[key];
  return icon ?? Icons.Layers;
}
