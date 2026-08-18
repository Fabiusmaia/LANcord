export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const FALLBACK_ICE_SERVERS: IceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

/** Credencial fixa gerada no dashboard da Metered (nao expira sozinha). Se as
 *  variaveis de ambiente nao estiverem configuradas, cai pro STUN publico. */
export async function getIceServers(): Promise<IceServer[]> {
  const username = process.env.METERED_TURN_USERNAME;
  const credential = process.env.METERED_TURN_CREDENTIAL;
  if (!username || !credential) return FALLBACK_ICE_SERVERS;

  return [
    { urls: "stun:stun.relay.metered.ca:80" },
    { urls: "turn:global.relay.metered.ca:80", username, credential },
    { urls: "turn:global.relay.metered.ca:80?transport=tcp", username, credential },
    { urls: "turn:global.relay.metered.ca:443", username, credential },
    { urls: "turns:global.relay.metered.ca:443?transport=tcp", username, credential },
  ];
}
