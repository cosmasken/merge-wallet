import TransactionDetailView from "@/views/settings/TransactionDetailView"

export const routeTx = [
  {
    path: "tx/:hash",
    element: <TransactionDetailView />,
  },
]
