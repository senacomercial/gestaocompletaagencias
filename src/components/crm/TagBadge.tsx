interface TagBadgeProps {
  nome: string
  cor: string
  className?: string
}

export function TagBadge({ nome, cor, className }: TagBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${className ?? ''}`}
      style={{ backgroundColor: `${cor}22`, color: cor, border: `1px solid ${cor}44` }}
    >
      {nome}
    </span>
  )
}
