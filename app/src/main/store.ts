import { ipcMain } from "electron";
import Store from "electron-store";
import { IPC } from "../shared/ipcChannels";
import type { RecentConnection } from "../shared/types";

type StoreSchema = {
  recentConnections: RecentConnection[];
};

const store = new Store<StoreSchema>({
  defaults: { recentConnections: [] },
});

export function registerStoreHandlers(): void {
  ipcMain.handle(IPC.GET_RECENT_CONNECTIONS, () => {
    return store.get("recentConnections");
  });

  ipcMain.handle(IPC.ADD_RECENT_CONNECTION, (_event, connection: RecentConnection) => {
    const existing = store.get("recentConnections").filter((c) => c.address !== connection.address);
    const updated = [connection, ...existing].slice(0, 8);
    store.set("recentConnections", updated);
    return updated;
  });
}
