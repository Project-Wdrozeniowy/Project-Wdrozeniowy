import { useEffect, useId, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  buildEditPostRequest,
  canEditPost,
  editPostError,
  POST_TEXT_FIELDS,
  validatePostText,
} from './editPost';
import type { PostText } from './editPost';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import { getGetPostQueryKey } from '@/shared/api/generated/orbita.api';
import { useCurrentUser } from '@/shared/api/profile/currentUser';
import { useEditPost } from '@/shared/api/forum/useEditPost';
import { apiErrorStatus } from '@/shared/api/client/apiError';
import PostDialog from '@/shared/ui/PostDialog';
import PostTextField from '@/shared/ui/PostTextField';
import { toast } from '@/shared/lib/toast';
import { sessionEvents } from '@/shared/auth/sessionEvents';

interface EditPostButtonProps {
  post: PostDto;
}

export function EditPostButton({ post }: EditPostButtonProps) {
  const user = useCurrentUser();
  // Account/post changes discard the old local draft, including during a pending request.
  if (!canEditPost(post, user)) return null;
  return <OwnPostEditor key={`${post.id}:${user!.id}`} post={post} />;
}

type OwnPostEditorProps = EditPostButtonProps;

function OwnPostEditor({ post }: OwnPostEditorProps) {
  const [initial, setInitial] = useState<PostDto | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => setInitial(post)}
        className="rounded px-3 py-2 text-sm font-semibold text-fg-muted hover:bg-raised hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        Edit post
      </button>
      {initial && <EditPostDialog post={initial} onClose={() => setInitial(null)} />}
    </>
  );
}

interface EditPostDialogProps extends EditPostButtonProps {
  onClose: () => void;
}

function EditPostDialog({ post, onClose }: EditPostDialogProps) {
  const baseId = useId();
  const client = useQueryClient();
  const user = useCurrentUser();
  const mutation = useEditPost(post);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const alertRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | undefined>();
  const {
    register,
    handleSubmit,
    control,
    setError,
    clearErrors,
    setFocus,
    formState: { errors },
  } = useForm<PostText>({ defaultValues: { title: post.title, content: post.content } });
  const values = useWatch({ control });
  const hasChanges = values.title !== post.title || values.content !== post.content;
  const [focusRequest, setFocusRequest] = useState<keyof PostText>();
  useEffect(() => {
    if (message) alertRef.current?.focus();
  }, [message]);
  useEffect(() => {
    if (!mutation.isPending && focusRequest) setFocus(focusRequest);
  }, [mutation.isPending, focusRequest, setFocus]);

  async function save(values: PostText) {
    if (!mounted.current || submitting.current) return;
    clearErrors();
    const fields = validatePostText(values, post);
    for (const field of POST_TEXT_FIELDS)
      if (fields[field]) setError(field, { message: fields[field] });
    const first = POST_TEXT_FIELDS.find((field) => fields[field]);
    if (first) {
      setFocus(first);
      return;
    }
    const data = buildEditPostRequest(values, post);
    if (!Object.keys(data).length) return;
    submitting.current = true;
    const generation = sessionEvents.current();
    setFocusRequest(undefined);
    try {
      await mutation.mutateAsync({ slug: post.slug, data });
      if (!mounted.current || generation !== sessionEvents.current()) return;
      toast.success('Post updated.');
      onClose();
    } catch (error: unknown) {
      if (!mounted.current) return;
      const failure = editPostError(error);
      for (const field of POST_TEXT_FIELDS)
        if (failure.fields[field]) setError(field, { message: failure.fields[field] });
      setFocusRequest(POST_TEXT_FIELDS.find((field) => failure.fields[field]));
      setMessage(failure.message);
      if ([403, 404].includes(apiErrorStatus(error) ?? 0)) {
        void client.invalidateQueries({ queryKey: getGetPostQueryKey(post.slug) }).then(() => {
          // Withdrawal/locking may remove the editor and its inline error. Keep the rejection visible.
          const key = getGetPostQueryKey(post.slug);
          const latest = client.getQueryData<PostDto>(key);
          const unavailable =
            apiErrorStatus(client.getQueryState(key)?.error) === 404 ||
            (latest && !canEditPost(latest, user));
          if (unavailable && generation === sessionEvents.current()) {
            toast.error(failure.message ?? 'This post is no longer available for editing.');
          }
        });
      }
    } finally {
      submitting.current = false;
    }
  }

  return (
    <PostDialog
      open
      busy={mutation.isPending}
      title="Edit post"
      description="Update your title and body"
      onClose={() => {
        if (!submitting.current) onClose();
      }}
    >
      <form
        noValidate
        aria-label="Edit post"
        onSubmit={handleSubmit(save)}
        className="flex flex-col gap-4"
        aria-busy={mutation.isPending}
      >
        {message && (
          <div
            ref={alertRef}
            role="alert"
            tabIndex={-1}
            className="rounded border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          >
            {message}
          </div>
        )}
        {POST_TEXT_FIELDS.map((field) => (
          <PostTextField
            key={field}
            kind={field}
            id={`${baseId}-${field}`}
            registration={register(field)}
            used={values[field]?.length ?? 0}
            error={errors[field]?.message}
            readOnly={mutation.isPending}
          />
        ))}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => {
              if (!submitting.current) onClose();
            }}
            disabled={mutation.isPending}
            className="rounded border border-line bg-surface px-4 py-2 text-sm font-semibold text-fg hover:bg-raised disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!hasChanges || mutation.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"
          >
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
        {mutation.isPending && (
          <p role="status" className="sr-only">
            Saving changes
          </p>
        )}
      </form>
    </PostDialog>
  );
}
