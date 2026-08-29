import { useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/providers/LanguageProvider'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry: () => void | Promise<unknown>
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this data. Check your connection and try again.',
  onRetry,
}: ErrorStateProps) {
  const { language, t } = useLanguage()
  const [retrying, setRetrying] = useState(false)

  const retry = async () => {
    setRetrying(true)
    try {
      const result = await onRetry()
      if (result && typeof result === 'object' && 'isError' in result && result.isError) {
        window.location.reload()
      }
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title === 'Something went wrong' && language === 'id' ? 'Terjadi kesalahan' : title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description === 'We could not load this data. Check your connection and try again.' && language === 'id' ? 'Data tidak dapat dimuat. Periksa koneksi Anda lalu coba lagi.' : description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={retry} disabled={retrying} className="gap-2">
        <RefreshCw className={retrying ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> {retrying ? t('retrying') : t('tryAgain')}
      </Button>
    </div>
  )
}
