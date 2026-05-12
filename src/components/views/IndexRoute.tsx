import { Navigate } from "react-router";
import { useSelector } from "react-redux";

import { selectWalletAddress } from "@/redux/wallet";

export default function IndexRoute() {
  const address = useSelector(selectWalletAddress);
  return <Navigate to={address ? "/wallet" : "/onboarding"} replace />;
}
