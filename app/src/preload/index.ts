import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipcChannels";
import type { RecentConnection, ScreenSource } from "../shared/types";

const electronAPI = {
  getRecentConnections: (): Promise<RecentConnection[]> => ipcRenderer.invoke(IPC.GET_RECENT_CONNECTIONS),
  addRecentConnection: (connection: RecentConnection): Promise<RecentConnection[]> =>
    ipcRenderer.invoke(IPC.ADD_RECENT_CONNECTION, connection),
  getScreenSources: (): Promise<ScreenSource[]> => ipcRenderer.invoke(IPC.GET_SCREEN_SOURCES),
  setSelectedSource: (sourceId: string): Promise<void> => ipcRenderer.invoke(IPC.SET_SELECTED_SOURCE, sourceId),
};

export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
