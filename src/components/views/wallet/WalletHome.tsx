import { useNavigate } from "react-router-dom";

import Button from "@/atoms/Button";
import Card from "@/atoms/Card";
import WeiDisplay from "@/atoms/WeiDisplay";
import SendIcon from "@/icons/SendIcon";
import ReceiveIcon from "@/icons/ReceiveIcon";
import HistoryIcon from "@/icons/HistoryIcon";

export default function WalletHome() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-6 px-4 pt-8">
      <div className="text-center">
        <div className="text-4xl font-bold text-neutral-800 dark:text-neutral-100">
          <WeiDisplay value={0n} />
        </div>
        <p className="text-sm text-neutral-500 mt-1">~$0.00 USD</p>
      </div>

      <div className="flex gap-4 w-full max-w-sm">
        <Button
          label="Send"
          icon={SendIcon}
          variant="primary"
          fullWidth
          onClick={() => navigate("/wallet/send")}
        />
        <Button
          label="Receive"
          icon={ReceiveIcon}
          variant="secondary"
          fullWidth
          onClick={() => navigate("/wallet/receive")}
        />
      </div>

      <div className="w-full max-w-sm">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-neutral-500 mb-3">Tokens</h2>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">RBTC</div>
              <span className="font-medium">Rootstock RBTC</span>
            </div>
            <span className="font-mono text-sm"><WeiDisplay value={0n} /></span>
          </div>
        </Card>
      </div>

      <Button
        label="Transaction History"
        icon={HistoryIcon}
        variant="ghost"
        onClick={() => navigate("/wallet/history")}
      />
    </div>
  );
}
