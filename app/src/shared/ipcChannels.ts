export const IPC = {
  GET_SCREEN_SOURCES: "screenshare:get-sources",
  SET_SELECTED_SOURCE: "screenshare:set-selected-source",
  GET_RECENT_CONNECTIONS: "connections:get",
  ADD_RECENT_CONNECTION: "connections:add",
  START_APP_AUDIO: "screenshare:start-app-audio",
  STOP_APP_AUDIO: "screenshare:stop-app-audio",
  APP_AUDIO_CHUNK: "screenshare:app-audio-chunk",
} as const;
