import ProtocolDashboard from "@/views/protocols/ProtocolDashboard";
import SovrynSwapView from "@/views/protocols/SovrynSwapView";
import SovrynEarnView from "@/views/protocols/SovrynEarnView";

export const routeProtocols = [
  {
    path: "/protocols",
    children: [
      {
        index: true,
        element: <ProtocolDashboard />,
      },
      {
        path: "sovryn/swap",
        element: <SovrynSwapView />,
      },
      {
        path: "sovryn/earn",
        element: <SovrynEarnView />,
      },
    ],
  },
];
