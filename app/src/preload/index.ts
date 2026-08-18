import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipcChannels";
import type { RecentConnection, ScreenSource } from "../shared/types";

const electronAPI = {
  getRecentConnections: (): Promise<RecentConnection[]> => ipcRenderer.invoke(IPC.GET_RECENT_CONNECTIONS),
  addRecentConnection: (connection: RecentConnection): Promise<RecentConnection[]> =>
    ipcRenderer.invoke(IPC.ADD_RECENT_CONNECTION, connection),
  getScreenSources: (): Promise<ScreenSource[]> => ipcRenderer.invoke(IPC.GET_SCREEN_SOURCES),
  setSelectedSource: (sourceId: string): Promise<void> => ipcRenderer.invoke(IPC.SET_SELECTED_SOURCE, sourceId),
  startAppAudioCapture: (sourceId: string): Promise<boolean> => ipcRenderer.invoke(IPC.START_APP_AUDIO, sourceId),
  stopAppAudioCapture: (): Promise<void> => ipcRenderer.invoke(IPC.STOP_APP_AUDIO),
  onAppAudioChunk: (callback: (chunk: Uint8Array) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: Uint8Array): void => callback(chunk);
    ipcRenderer.on(IPC.APP_AUDIO_CHUNK, listener);
    return () => ipcRenderer.removeListener(IPC.APP_AUDIO_CHUNK, listener);
  },
};

export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
