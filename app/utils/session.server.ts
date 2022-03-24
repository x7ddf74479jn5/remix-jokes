import { createCloudflareKVSessionStorage, redirect } from 'remix';
import { db } from './db.server';
import { Session } from '@supabase/supabase-js';
import { definitions } from '~/types/tables';
type LoginForm = {
  email: string;
  password: string;
};
type SignUpForm = LoginForm & { username: string };

export async function login({ email, password }: LoginForm) {
  const { user, session } = await db.auth.signIn({ email, password });
  if (!user) return null;
  return { session };
}

const storage = createCloudflareKVSessionStorage({
  cookie: {
    name: 'RJ_session',
    // normally you want this to be `secure: true`
    // but that doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: process.env.NODE_ENV === 'production',
    secrets: [SESSION_SECRET],
    sameSite: 'lax',
    path: '/',
    maxAge: 3600, //1時間
    httpOnly: true,
  },
  kv: JOKES_SESSION_STORAGE,
});

function getUserSession(request: Request) {
  return storage.getSession(request.headers.get('Cookie'));
}

export async function getUserToken(request: Request) {
  const session = await getUserSession(request);
  const accessToken = await session.get('access_token');
  if (!accessToken || typeof accessToken !== 'string') return null;
  return accessToken;
}

export async function requireUserToken(request: Request, redirectTo: string = new URL(request.url).pathname) {
  const session = await getUserSession(request);
  const accessToken = await session.get('access_token');

  const user = await db.auth.api.getUser(accessToken);
  if (!accessToken || !user) {
    const searchParams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/login?${searchParams}`, 401);
  }
  return user.data?.id;
}

export async function getUser(request: Request) {
  try {
    const session = await getUserSession(request);
    const accessToken = await session.get('access_token');
    const { user } = await db.auth.api.getUser(accessToken);
    if (user) {
      return db.from<definitions['user']>('user').select('*').eq('id', user.id).maybeSingle();
    }
  } catch {
    throw logout(request);
  }
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  if (!session) {
    return redirect('/login');
  }
  return redirect('/login', {
    headers: {
      'Set-Cookie': await storage.destroySession(session),
    },
  });
}

export async function createUserSession(supabaseSession: Session | null, redirectTo: string) {
  const session = await storage.getSession('Cookie');
  session.set('access_token', supabaseSession?.access_token);
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await storage.commitSession(session),
    },
  });
}

export async function register({ email, password, username }: SignUpForm) {
  const { user, error: signUpError } = await db.auth.signUp({ email, password });
  if (signUpError || !user) {
    return { error: signUpError };
  }
  const { error: userError } = await db.from('user').insert(
    {
      username: username,
      id: user.id,
    },
    { returning: 'minimal' }
  );
  if (userError) return { error: userError };

  return { user };
}
