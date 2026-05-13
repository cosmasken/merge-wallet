import { Navigate } from "react-router";
import { useSelector } from "react-redux";
import { selectWalletAddress } from "@/redux/wallet";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const walletAddress = useSelector(selectWalletAddress);
  
  if (!walletAddress) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}
