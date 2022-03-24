import type { LoaderFunction } from 'remix';
import { useLoaderData, Link, useCatch } from 'remix';
import type { definitions } from '~/types/tables';
import { db } from '~/utils/db.server';

type LoaderData = definitions['joke'];

export const loader: LoaderFunction = async () => {
  const { count } = await db.from('joke').select('*', { count: 'exact' });
  if (!count) {
    throw new Response('No random joke found', {
      status: 404,
    });
  }
  const randomRowNumber = Math.floor(Math.random() * count);
  const { data } = await db.from('joke').select('*').range(randomRowNumber, randomRowNumber).maybeSingle();

  const res: LoaderData = data;
  return res;
};

export default function JokesIndexRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's a random joke:</p>
      <p>{data.content}</p>
      <Link to={data.id}>"{data.name}" Permalink</Link>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return <div className='error-container'>There are no jokes to display.</div>;
  }
  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}

export function ErrorBoundary() {
  return <div className='error-container'>I did a whoopsies.</div>;
}
