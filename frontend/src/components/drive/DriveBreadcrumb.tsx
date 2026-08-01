'use client'

import Link from 'next/link'
import { ChevronRight, HardDrive } from 'lucide-react'
import { BreadcrumbItem } from '@/types/drive'
import { cn } from '@/lib/utils'

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function DriveBreadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            )}
            {isLast ? (
              <span className="font-semibold text-foreground truncate max-w-[200px]">
                {item.name}
              </span>
            ) : item.uuid ? (
              <Link
                href={`/drive/${item.uuid}`}
                className={cn(
                  'text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px]',
                  'flex items-center gap-1.5'
                )}
              >
                {index === 0 && <HardDrive className="w-3.5 h-3.5 shrink-0" />}
                {item.name}
              </Link>
            ) : (
              <Link
                href="/drive"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                {item.name}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
