interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-[#e5e7eb] animate-pulse ${className}`}
      style={{ borderRadius: 0 }}
    />
  )
}
