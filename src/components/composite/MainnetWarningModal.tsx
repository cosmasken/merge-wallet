import { useState } from 'react';
import Button from '../atoms/Button';

interface MainnetWarningModalProps {
  isOpen: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

export default function MainnetWarningModal({ isOpen, onConfirm, onCancel }: MainnetWarningModalProps) {
  const [understood, setUnderstood] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(dontShowAgain);
    setUnderstood(false);
    setDontShowAgain(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-2">
          SWITCHING TO MAINNET
        </h2>

        {/* Description */}
        <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-3 mb-6">
          <p>
            You are switching to Rootstock Mainnet where transactions use <strong>REAL RBTC</strong> with real value.
          </p>
          
          <ul className="space-y-1 ml-4">
            <li>• All transactions will cost real fees</li>
            <li>• Mistakes cannot be undone</li>
            <li>• Double-check all addresses</li>
            <li>• Start with small amounts</li>
          </ul>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-blue-800 dark:text-blue-200 font-medium text-sm">
              Additional features available on Mainnet:
            </p>
            <ul className="text-blue-700 dark:text-blue-300 text-sm mt-1">
              <li>• Rootstock Collective Governance</li>
              <li>• Real DeFi protocols</li>
            </ul>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-primary bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 rounded focus:ring-primary focus:ring-2"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              I understand I'm using real funds
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-primary bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 rounded focus:ring-primary focus:ring-2"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Don't show this again
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            variant="primary"
            fullWidth
            disabled={!understood}
            onClick={handleConfirm}
          >
            Continue to Mainnet
          </Button>
        </div>
      </div>
    </div>
  );
}
