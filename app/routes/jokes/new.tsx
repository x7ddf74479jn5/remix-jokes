import type { ActionFunction, LoaderFunction } from 'remix';
import { useActionData, redirect, json, useCatch, Link, useTransition } from 'remix';
import { PostgrestError } from '@supabase/supabase-js';
import { JokeDisplay } from '~/components/joke';
import { db } from '~/utils/db.server';
import { getUser, requireUserToken } from '~/utils/session.server';

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return {};
};

function validateJokeContent(content: string) {
  if (content.length < 10) {
    return `That joke is too short`;
  }
}

function validateJokeName(name: string) {
  if (name.length < 3) {
    return `That joke's name is too short`;
  }
}

type ActionData = {
  formError?: string;
  fieldErrors?: {
    name: string | undefined;
    content: string | undefined;
  };
  fields?: {
    name: string;
    content: string;
  };
};

const badRequest = (data: ActionData) => json(data, { status: 400 });

export const action: ActionFunction = async ({ request }) => {
  const userId = await requireUserToken(request);
  const form = await request.formData();
  const name = form.get('name');
  const content = form.get('content');
  if (typeof name !== 'string' || typeof content !== 'string') {
    return badRequest({
      formError: `Form not submitted correctly.`,
    });
  }
  const fieldErrors = {
    name: validateJokeName(name),
    content: validateJokeContent(content),
  };
  const fields = { name, content };
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields });
  }

  const { data, error } = await db
    .from('joke')
    .insert({ ...fields, jokester_id: userId })
    .maybeSingle();
  if (error?.code === '42501') {
    return badRequest({
      formError: `Insert not successed.`,
    });
  }
  if (error) throw Error(error?.message);
  return redirect(`/jokes/${data.id}`);
};

export default function NewJokeRoute() {
  const actionData = useActionData<ActionData>();
  const transition = useTransition();
  if (transition.submission) {
    const name = transition.submission.formData.get('name');
    const content = transition.submission.formData.get('content');
    if (
      typeof name === 'string' &&
      typeof content === 'string' &&
      !validateJokeContent(content) &&
      !validateJokeName(name)
    ) {
      return <JokeDisplay joke={{ name, content }} isOwner={true} canDelete={false} />;
    }
  }
  return (
    <div>
      <p>Add your own hilarious joke</p>
      <form method='post'>
        <div>
          <label>
            Name:{' '}
            <input
              type='text'
              defaultValue={actionData?.fields?.name}
              name='name'
              aria-invalid={Boolean(actionData?.fieldErrors?.name) || undefined}
              aria-errormessage={actionData?.fieldErrors?.name ? 'name-error' : undefined}
            />
          </label>
          {actionData?.fieldErrors?.name ? (
            <p className='form-validation-error' role='alert' id='name-error'>
              {actionData.fieldErrors.name}
            </p>
          ) : null}
        </div>
        <div>
          <label>
            Content:{' '}
            <textarea
              defaultValue={actionData?.fields?.content}
              name='content'
              aria-invalid={Boolean(actionData?.fieldErrors?.content) || undefined}
              aria-errormessage={actionData?.fieldErrors?.content ? 'content-error' : undefined}
            />
          </label>
          {actionData?.fieldErrors?.content ? (
            <p className='form-validation-error' role='alert' id='content-error'>
              {actionData.fieldErrors.content}
            </p>
          ) : null}
        </div>
        <div>
          <button type='submit' className='button'>
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  if (caught.status === 401) {
    return (
      <div className='error-container'>
        <p>You must be logged in to create a joke.</p>
        <Link to='/login'>Login</Link>
      </div>
    );
  }
}

export function ErrorBoundary() {
  return <div className='error-container'>Something unexpected went wrong. Sorry about that.</div>;
}
