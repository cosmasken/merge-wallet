import { useNavigate } from "react-router-dom";

export default function ForgotPinScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-1000 px-4">
      <h1 className="text-xl font-bold text-white">Forgot PIN</h1>
      <p className="text-neutral-400 text-sm text-center max-w-xs">
        Resetting your PIN will require restoring your wallet from the recovery phrase.
      </p>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-3 rounded-full bg-primary text-white font-semibold"
      >
        Back to Login
      </button>
    </div>
  );
}
