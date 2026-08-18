import { desktopCapturer, ipcMain, session } from "electron";
import { IPC } from "../shared/ipcChannels";
import type { ScreenSource } from "../shared/types";

let selectedSourceId: string | null = null;

export function registerScreenShareHandlers(): void {
  ipcMain.handle(IPC.GET_SCREEN_SOURCES, async (): Promise<ScreenSource[]> => {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 320, height: 180 },
    });
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnailDataUrl: source.thumbnail.toDataURL(),
    }));
  });

  ipcMain.handle(IPC.SET_SELECTED_SOURCE, (_event, sourceId: string) => {
    selectedSourceId = sourceId;
  });

  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    if (!selectedSourceId) {
      callback({});
      return;
    }
    desktopCapturer.getSources({ types: ["screen", "window"] }).then((sources) => {
      const source = sources.find((s) => s.id === selectedSourceId);
      selectedSourceId = null;
      if (source) {
        callback({ video: source, audio: "loopback" });
      } else {
        callback({});
      }
    });
  });
}
