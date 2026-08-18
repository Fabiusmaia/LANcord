import { useConnectionStore } from "@renderer/store/connectionStore";
import ConnectScreen from "@renderer/screens/ConnectScreen";
import RoomScreen from "@renderer/screens/RoomScreen";

export default function App(): JSX.Element {
  const status = useConnectionStore((s) => s.status);

  if (status === "connected") {
    return <RoomScreen />;
  }
  return <ConnectScreen />;
}
