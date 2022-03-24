import { Link, Form } from 'remix';
import { definitions } from '~/types/tables';

export function JokeDisplay({
  joke,
  isOwner,
  canDelete = true,
}: {
  joke: Pick<definitions['joke'], 'content' | 'name'>;
  isOwner: boolean;
  canDelete?: boolean;
}) {
  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{joke.content}</p>
      <Link to='.'>{joke.name} Permalink</Link>
      {isOwner ? (
        <Form method='post'>
          <input type='hidden' name='_method' value='delete' />
          <button type='submit' className='button' disabled={!canDelete}>
            Delete
          </button>
        </Form>
      ) : null}
    </div>
  );
}
