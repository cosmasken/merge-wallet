import React from 'react';
import Card from '../atoms/Card';
import Button from '../atoms/Button';
import WeiDisplay from '../atoms/WeiDisplay';
import FiatValue from '../atoms/FiatValue';
import Address from '../atoms/Address';

export interface TransactionConfirmationProps {
  transaction: {
    to: `0x${string}`;
    value: bigint;
    gasEstimate: bigint;
    gasPrice: bigint;
    total: bigint;
    token: {
      symbol: string;
      decimals: number;
      type: 'native' | 'erc20';
      address?: `0x${string}`;
    };
  };
  onConfirm: () => Promise<void>;
  onEdit: () => void;
  onCancel: () => void;
}

const TransactionConfirmation: React.FC<TransactionConfirmationProps> = ({
  transaction,
  onConfirm,
  onEdit,
  onCancel,
}) => {
  const { to, value, gasEstimate, gasPrice, total, token } = transaction;
  const networkFee = gasEstimate * gasPrice;

  return (
    <div className="flex flex-col gap-6 p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Confirm Transaction</h2>
        <p className="text-gray-400">Please review the details below</p>
      </div>

      <Card className="bg-gray-900/50 border-gray-800">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Recipient</span>
            <Address address={to} className="text-white font-mono" />
          </div>

          <div className="border-t border-gray-800 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Amount</span>
              <div className="text-right">
                <WeiDisplay 
                  wei={value} 
                  decimals={token.decimals} 
                  symbol={token.symbol} 
                  className="text-xl font-bold text-white" 
                />
                <FiatValue wei={value} symbol={token.symbol} decimals={token.decimals} className="text-sm text-gray-500" />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400">Network Fee</span>
            <div className="text-right">
              <WeiDisplay 
                wei={networkFee} 
                decimals={18} 
                symbol={token.symbol} 
                className="text-white" 
              />
              <FiatValue wei={networkFee} symbol="RBTC" decimals={18} className="text-sm text-gray-500" />
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4 flex justify-between items-center">
            <span className="text-gray-400 font-bold">Total Amount</span>
            <div className="text-right">
              <WeiDisplay 
                wei={total} 
                decimals={token.decimals} 
                symbol={token.symbol} 
                className="text-2xl font-black text-primary-400" 
              />
              <FiatValue wei={total} symbol={token.symbol} decimals={token.decimals} className="text-sm text-gray-500" />
            </div>
          </div>
        </div>
      </Card>

      {/* Security Warning */}
      <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded-xl flex gap-3">
        <div className="text-amber-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h4 className="text-amber-500 font-bold text-sm">Security Check</h4>
          <p className="text-amber-200/70 text-xs">Always verify the recipient address. Transactions on Rootstock are irreversible.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <Button 
          variant="primary" 
          size="lg" 
          fullWidth 
          onClick={onConfirm}
          className="bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-900/20"
        >
          Confirm and Send
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" size="md" fullWidth onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TransactionConfirmation;
