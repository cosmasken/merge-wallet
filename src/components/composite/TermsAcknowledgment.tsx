import { useState } from "react"

interface TermsAcknowledgmentProps {
  onAccept: () => void
}

export default function TermsAcknowledgment({ onAccept }: TermsAcknowledgmentProps) {
  const [understood, setUnderstood] = useState(false)

  const handleAccept = () => {
    localStorage.setItem("termsAccepted", "true")
    onAccept()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 gap-6 animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Before You Start</h1>
        <p className="text-sm text-neutral-500 mt-1">Important information about self-custody</p>
      </div>

      <div className="w-full bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
        <p className="font-semibold text-neutral-700 dark:text-neutral-300">
          Merge Wallet is a <strong>self-custodial</strong> wallet. This means:
        </p>

        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-error shrink-0 mt-0.5">✕</span>
            <span>We <strong>cannot</strong> recover your funds if you lose your seed phrase or private keys.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-error shrink-0 mt-0.5">✕</span>
            <span>We <strong>cannot</strong> reverse or cancel transactions once sent.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-error shrink-0 mt-0.5">✕</span>
            <span>We <strong>cannot</strong> reset your PIN or access your account for you.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-success shrink-0 mt-0.5">✓</span>
            <span><strong>You</strong> are in full control of your assets at all times.</span>
          </li>
        </ul>

        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800/40">
          <p className="text-amber-800 dark:text-amber-200 font-medium text-xs">
            Your seed phrase is the <strong>only</strong> way to recover your wallet. Write it down and store it somewhere safe. Never share it with anyone.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer w-full">
        <input
          type="checkbox"
          checked={understood}
          onChange={e => setUnderstood(e.target.checked)}
          className="mt-0.5 w-5 h-5 text-primary bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 rounded focus:ring-primary focus:ring-2 shrink-0"
        />
        <span className="text-sm text-neutral-700 dark:text-neutral-300">
          I understand that I am solely responsible for my seed phrase and private keys. No one can recover my funds for me.
        </span>
      </label>

      <button
        onClick={handleAccept}
        disabled={!understood}
        className="w-full p-4 rounded-xl bg-primary text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-default active:bg-primary-dark transition-colors"
      >
        I Understand, Continue
      </button>
    </div>
  )
}
