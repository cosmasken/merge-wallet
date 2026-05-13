import React, { useState, useEffect } from 'react';
import Card from '../atoms/Card';
import Button from '../atoms/Button';

export interface BackupVerificationProps {
  mnemonic: string;
  onSuccess: () => void;
  onCancel: () => void;
  isRequired: boolean;
}

const BackupVerification: React.FC<BackupVerificationProps> = ({
  mnemonic,
  onSuccess,
  onCancel,
  isRequired,
}) => {
  const words = mnemonic.split(' ');
  const [targetIndices, setTargetIndices] = useState<number[]>([]);
  const [options, setOptions] = useState<string[][]>([]);
  const [selections, setSelections] = useState<(string | null)[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");

  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    // Select 3 random indices to verify
    const indices: number[] = [];
    while (indices.length < 3) {
      const r = Math.floor(Math.random() * words.length);
      if (!indices.includes(r)) indices.push(r);
    }
    indices.sort((a, b) => a - b);
    setTargetIndices(indices);

    // Generate options for each index (1 correct, 3 random decoys)
    const allOptions = indices.map(idx => {
      const correct = words[idx];
      const decoys = words.filter(w => w !== correct).sort(() => 0.5 - Math.random()).slice(0, 3);
      return [correct, ...decoys].sort(() => 0.5 - Math.random());
    });
    setOptions(allOptions);
    setSelections(new Array(indices.length).fill(null));
  }, [mnemonic]);

  const handleVerify = () => {
    const isCorrect = targetIndices.every((idx, i) => selections[i] === words[idx]);
    
    if (isCorrect) {
      onSuccess();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setError("Max attempts exceeded. Please review your seed phrase again.");
      } else {
        setError(`Incorrect words. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
      }
    }
  };

  const allSelected = selections.every(s => s !== null);

  return (
    <div className="flex flex-col gap-6 p-4 animate-in fade-in duration-300">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Verify Backup</h2>
        <p className="text-gray-400">Select the correct words to confirm your backup</p>
      </div>

      <div className="space-y-6">
        {targetIndices.map((idx, i) => (
          <div key={idx} className="space-y-3">
            <label className="text-sm font-medium text-primary-400">Word #{idx + 1}</label>
            <div className="grid grid-cols-2 gap-2">
              {options[i]?.map(word => (
                <button
                  key={word}
                  onClick={() => {
                    const newSels = [...selections];
                    newSels[i] = word;
                    setSelections(newSels);
                    setError("");
                  }}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    selections[i] === word
                      ? "border-primary bg-primary/20 text-white"
                      : "border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700"
                  }`}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-900/20 border border-red-900/50 flex gap-3 items-center animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-red-200 text-sm">{error}</span>
        </div>
      )}

      <div className="mt-auto space-y-3">
        <Button 
          variant="primary" 
          fullWidth 
          disabled={!allSelected || attempts >= MAX_ATTEMPTS}
          onClick={handleVerify}
        >
          Verify and Complete
        </Button>
        <Button variant="ghost" fullWidth onClick={onCancel}>
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default BackupVerification;
