import 'server-only';

import {getSession} from './server';
import {SessionContext} from './SessionContext';

interface SessionProviderProps {
  readonly children: React.ReactNode;
}

export async function SessionProvider({children}: SessionProviderProps) {
  return <SessionContext value={await getSession()}>{children}</SessionContext>;
}
