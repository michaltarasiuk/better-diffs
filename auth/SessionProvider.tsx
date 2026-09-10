import 'server-only';

import {SessionContext} from './context';
import {getSession} from './server';

interface SessionProviderProps {
  readonly children: React.ReactNode;
}

export async function SessionProvider({children}: SessionProviderProps) {
  return <SessionContext value={await getSession()}>{children}</SessionContext>;
}
