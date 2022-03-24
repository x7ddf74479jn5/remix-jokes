import { LinksFunction, ActionFunction, MetaFunction, useActionData } from 'remix';
import { Link, useSearchParams, json } from 'remix';
import { useState } from 'react';
import { register, login, createUserSession } from '~/utils/session.server';
import stylesUrl from '../styles/login.css';

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: stylesUrl }];
};

export const meta: MetaFunction = () => {
  return {
    title: 'Remix Jokes | Login',
    description: 'Login to submit your own jokes to Remix Jokes!',
  };
};

function validateUsername(username: unknown, logintype: string) {
  if (logintype == 'login') {
    return;
  }
  if (typeof username !== 'string' || username.length < 3) {
    return `Usernames must be at least 3 characters long`;
  }
}

function validateEmail(email: unknown) {
  if (typeof email !== 'string' || email.length < 3) {
    return `You will need to enter your email.`;
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== 'string' || password.length < 6) {
    return `Passwords must be at least 6 characters long`;
  }
}
type ActionData = {
  formError?: string;
  fieldErrors?: {
    username: string | undefined;
    email: string | undefined;
    password: string | undefined;
  };
  fields?: {
    loginType: string;
    username: string;
    email: string;
    password: string;
  };
};

const badRequest = (data: ActionData) => json(data, { status: 400 });

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const loginType = form.get('loginType');
  const username = form.get('username');
  const email = form.get('email');
  const password = form.get('password');
  const redirectTo = form.get('redirectTo') || '/jokes';
  if (
    typeof loginType !== 'string' ||
    typeof username !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof redirectTo !== 'string'
  ) {
    return badRequest({
      formError: `Form not submitted correctly.`,
    });
  }
  const fields = { loginType, username, email, password };
  const fieldErrors = {
    username: validateUsername(username, loginType),
    email: validateEmail(email),
    password: validatePassword(password),
  };
  if (Object.values(fieldErrors).some(Boolean)) return badRequest({ fieldErrors, fields });

  switch (loginType) {
    case 'login': {
      const token = await login({ email, password });
      if (!token) {
        return badRequest({
          fields,
          formError: `Username/Password combination is incorrect`,
        });
      }
      const { session } = token;
      return createUserSession(session, redirectTo);
    }
    case 'register': {
      const { error } = await register({ email, password, username });
      if (error?.message) {
        return badRequest({
          formError: error.message,
        });
      }
      return {};
    }
    default: {
      return badRequest({
        fields,
        formError: `Login type invalid`,
      });
    }
  }
};

export default function Login() {
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();
  const [register, setRegister] = useState(actionData?.fields?.loginType === 'register');
  return (
    <div className='container'>
      <div className='content' data-light=''>
        <h1>Login</h1>
        <form method='post'>
          <input type='hidden' name='redirectTo' value={searchParams.get('redirectTo') ?? undefined} />
          <fieldset onChange={() => setRegister((prev) => !prev)}>
            <legend className='sr-only'>Login or Register?</legend>
            <label>
              <input
                type='radio'
                name='loginType'
                value='login'
                defaultChecked={actionData?.fields?.loginType == undefined || actionData?.fields?.loginType === 'login'}
              />{' '}
              Login
            </label>
            <label>
              <input
                type='radio'
                name='loginType'
                value='register'
                defaultChecked={actionData?.fields?.loginType === 'register'}
              />{' '}
              Register
            </label>
          </fieldset>
          <div style={register ? { display: 'block' } : { display: 'none' }}>
            <label htmlFor='username-input'>Username</label>
            <input
              type='text'
              id='username-input'
              name='username'
              autoComplete='username'
              defaultValue={actionData?.fields?.username}
              aria-invalid={Boolean(actionData?.fieldErrors?.username)}
              aria-errormessage={actionData?.fieldErrors?.username ? 'username-error' : undefined}
            />
            {actionData?.fieldErrors?.username ? (
              <p className='form-validation-error' role='alert' id='username-error'>
                {actionData.fieldErrors.username}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor='mail-input'>Email</label>
            <input
              type='email'
              id='email-input'
              name='email'
              autoComplete='email'
              defaultValue={actionData?.fields?.email}
              aria-invalid={Boolean(actionData?.fieldErrors?.email)}
              aria-errormessage={actionData?.fieldErrors?.email ? 'email-error' : undefined}
            />
            {actionData?.fieldErrors?.email ? (
              <p className='form-validation-error' role='alert' id='email-error'>
                {actionData.fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor='password-input'>Password</label>
            <input
              id='password-input'
              name='password'
              autoComplete={register ? 'new-password' : 'current-password'}
              defaultValue={actionData?.fields?.password}
              type='password'
              aria-invalid={Boolean(actionData?.fieldErrors?.password) || undefined}
              aria-errormessage={actionData?.fieldErrors?.password ? 'password-error' : undefined}
            />
            {actionData?.fieldErrors?.password ? (
              <p className='form-validation-error' role='alert' id='password-error'>
                {actionData.fieldErrors.password}
              </p>
            ) : null}
          </div>
          <div id='form-error-message'>
            {actionData?.formError ? (
              <p className='form-validation-error' role='alert'>
                {actionData.formError}
              </p>
            ) : null}
          </div>
          <button type='submit' className='button'>
            Submit
          </button>
        </form>
      </div>
      <div className='links'>
        <ul>
          <li>
            <Link to='/'>Home</Link>
          </li>
          <li>
            <Link to='/jokes'>Jokes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
