import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (id: string, title?: React.ReactNode, description?: React.ReactNode) => {
    const text = [title, description].filter(Boolean).join("\n")
    if (!text) return
    navigator.clipboard.writeText(String(text)).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isDestructive = variant === "destructive"
        return (
          <Toast key={id} variant={variant} {...props}>
            <div
              className={`grid gap-1 ${isDestructive ? "cursor-pointer select-none" : ""}`}
              onClick={isDestructive ? () => handleCopy(id, title, description) : undefined}
              title={isDestructive ? "Click to copy error" : undefined}
            >
              {title && (
                <ToastTitle className="flex items-center gap-2">
                  {title}
                  {isDestructive && (
                    <span className="text-xs font-normal opacity-70 ml-1">
                      {copiedId === id ? "✓ copied" : "click to copy"}
                    </span>
                  )}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
