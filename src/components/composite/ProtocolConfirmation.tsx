import { useEffect, useState } from "react"
import { useSelector } from "react-redux"

import Card from "@/atoms/Card"
import Button from "@/atoms/Button"
import SlideToAction from "@/atoms/SlideToAction"
import LoadingSpinner from "@/atoms/LoadingSpinner"
import { selectPendingTransactions } from "@/redux/wallet"
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService"
import NotificationService from "@/kernel/app/NotificationService"

interface ProtocolConfirmationProps {
  title: string
  description: string
  amount: string
  inputSymbol: string
  outputSymbol: string
  estimatedOutput?: string | null
  isLoadingOutput?: boolean
  isLoadingFee?: boolean
  fee?: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export default function ProtocolConfirmation({
  title,
  description,
  amount,
  inputSymbol,
  outputSymbol,
  estimatedOutput,
  isLoadingOutput,
  isLoadingFee,
  fee,
  onConfirm,
  onCancel,
}: ProtocolConfirmationProps) {
  const pendingTxs = useSelector(selectPendingTransactions)
  const activePending = pendingTxs.filter(t => t.status === "pending")
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = async () => {
    if (isConfirming) return
    setIsConfirming(true)
    try {
      const auth = await SecurityService().authorize(AuthActions.SendTransaction)
      if (!auth) {
        NotificationService().error("Authorization required")
        setIsConfirming(false)
        return
      }
      await onConfirm()
    } catch {
      NotificationService().error("Transaction cancelled")
      setIsConfirming(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 px-4">
      <div className="flex flex-col gap-4">

        {/* Header */}
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2v20M2 12h20" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-neutral-500 mt-1">{description}</p>
        </div>

        {/* Exchange summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold">{amount}</p>
              <p className="text-xs text-neutral-500 mt-1">{inputSymbol}</p>
            </div>
            <div className="px-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
            <div className="text-center flex-1">
              {isLoadingOutput ? (
                <div className="flex items-center justify-center gap-1.5">
                  <LoadingSpinner size="sm" />
                  <span className="text-xs text-neutral-400">Estimating...</span>
                </div>
              ) : estimatedOutput ? (
                <>
                  <p className="text-2xl font-bold text-primary">{estimatedOutput}</p>
                  <p className="text-xs text-neutral-500 mt-1">{outputSymbol}</p>
                </>
              ) : (
                <p className="text-sm text-neutral-400 italic">Unknown</p>
              )}
            </div>
          </div>
        </Card>

        {/* Fee */}
        <Card className="p-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-neutral-500">Network fee</span>
            {isLoadingFee ? (
              <LoadingSpinner size="sm" />
            ) : fee ? (
              <span className="font-mono">{fee} RBTC</span>
            ) : (
              <span className="text-neutral-400 italic">Estimating...</span>
            )}
          </div>
        </Card>

        {/* Pending tx warning */}
        {activePending.length > 0 && (
          <div className="p-3 rounded-lg bg-warn-light/20 border border-warn/30 text-xs text-warn-dark">
            <div className="flex items-center gap-2 mb-1">
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="font-semibold">{activePending.length} pending transaction{activePending.length > 1 ? "s" : ""}</span>
            </div>
            <p>Sending a new transaction while others are pending may affect your balance.</p>
          </div>
        )}

        {/* Confirm */}
        {!isConfirming ? (
          <div className="flex flex-col gap-3">
            <SlideToAction label={`Slide to confirm ${title}`} onSlide={handleConfirm} />
            <Button label="Cancel" variant="ghost" fullWidth onClick={onCancel} />
          </div>
        ) : (
          <div className="flex items-center justify-center py-4 gap-2 text-sm text-neutral-500">
            <LoadingSpinner size="sm" />
            <span>Authorizing...</span>
          </div>
        )}

      </div>
    </div>
  )
}
