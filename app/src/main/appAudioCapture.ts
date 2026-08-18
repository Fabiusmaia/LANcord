import { execFile } from "node:child_process";
import { BrowserWindow, ipcMain } from "electron";
import loopback from "loopback-capture";
import { IPC } from "../shared/ipcChannels";

type LoopbackCapture = InstanceType<typeof loopback.LoopbackCapture>;

let capture: LoopbackCapture | null = null;

/** O id de fonte de janela do desktopCapturer no Windows tem o HWND nativo
 *  embutido ("window:<HWND>:0"). Resolvemos o PID dono da janela via Win32
 *  (GetWindowThreadProcessId) chamando o powershell, sem precisar de mais
 *  um addon nativo so pra isso. */
function getPidForHwnd(hwnd: number): Promise<number | null> {
  const script = `
    Add-Type -Namespace Win32Interop -Name User32 -MemberDefinition '
      [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    ';
    $procId = 0;
    [Win32Interop.User32]::GetWindowThreadProcessId([IntPtr]${hwnd}, [ref]$procId) | Out-Null;
    Write-Output $procId
  `;
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { timeout: 5000 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const pid = Number(stdout.trim());
        resolve(Number.isFinite(pid) && pid > 0 ? pid : null);
      }
    );
  });
}

function stopCapture(): void {
  try {
    capture?.stop();
  } catch (err) {
    console.error("[appAudioCapture] erro ao parar captura", err);
  }
  capture = null;
}

export function registerAppAudioHandlers(): void {
  ipcMain.handle(IPC.START_APP_AUDIO, async (event, sourceId: string): Promise<boolean> => {
    stopCapture();
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;

    const next = new loopback.LoopbackCapture();
    capture = next;
    const send = (chunk: Buffer): void => {
      if (!win.isDestroyed()) win.webContents.send(IPC.APP_AUDIO_CHUNK, chunk);
    };

    const windowMatch = /^window:(\d+):/.exec(sourceId);
    const pid = windowMatch ? await getPidForHwnd(Number(windowMatch[1])) : null;

    try {
      if (pid) next.start(pid, true, send);
      else next.startSystemAudio(send);
    } catch (err) {
      console.error("[appAudioCapture] falha ao iniciar captura por processo, caindo pro sistema todo", err);
      try {
        next.startSystemAudio(send);
      } catch (fallbackErr) {
        console.error("[appAudioCapture] falha ao iniciar captura do sistema", fallbackErr);
        capture = null;
        return false;
      }
    }
    return true;
  });

  ipcMain.handle(IPC.STOP_APP_AUDIO, () => {
    stopCapture();
  });
}
