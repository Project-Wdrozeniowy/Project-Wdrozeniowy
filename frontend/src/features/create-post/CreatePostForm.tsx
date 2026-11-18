'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  emptyFormValues,
  buildCreatePostRequest,
  getCreatePostError,
} from '@/features/create-post/createPost';
import {
  CREATE_POST_FIELDS,
  CATEGORIES_EMPTY_MESSAGE,
  CATEGORIES_ERROR_MESSAGE,
  CONTENT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '@/features/create-post/createPost.const';
import type { CreatePostField } from '@/features/create-post/createPost.const';
import { createPostSchema } from '@/features/create-post/createPost.schema';
import type { CreatePostFormData } from '@/features/create-post/createPost.schema';
import { TagInput } from '@/features/create-post/TagInput';
import { categoriesQueryKey, useCategories } from '@/shared/api/forum/useCategories';
import type { Category } from '@/shared/api/forum/category.dto';
import { useCreatePost } from '@/shared/api/forum/useCreatePost';
import { cn } from '@/shared/lib/cn';
import { getFieldControlProps } from '@/shared/ui/fieldA11y';
import FormField from '@/shared/ui/FormField';

interface CreatePostFormProps {
  onCancel: () => void;
  /** Called when the user follows the "View post" link. */
  onViewPost?: () => void;
  /** Called once the post is published. */
  onPublished?: () => void;
}

function inputClass(invalid: boolean) {
  return cn('input', invalid && 'ring-2 ring-red-500');
}

export function CreatePostForm({ onCancel, onViewPost, onPublished }: CreatePostFormProps) {
  const baseId = useId();
  const ids = {
    title: `${baseId}-title`,
    category: `${baseId}-category`,
    content: `${baseId}-content`,
  };
  const categories = useCategories();
  const queryClient = useQueryClient();
  // Which field should get the focus once the form is editable again (see the effect below).
  const [focusRequest, setFocusRequest] = useState<CreatePostField | null>(null);
  const { mutateAsync, isPending } = useCreatePost();
  const [formError, setFormError] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    setValue,
    control,
    formState: { errors, isValid },
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: emptyFormValues(),
    // Errors appear once a field has been left, not while the user is still typing the first time.
    mode: 'onTouched',
  });

  // useWatch (not watch) so the React Compiler can optimize this component.
  const title = useWatch({ control, name: 'title' }) ?? '';
  const content = useWatch({ control, name: 'content' }) ?? '';

  useEffect(() => {
    if (formError) alertRef.current?.focus();
  }, [formError]);

  // The select is disabled while publishing and the catch block runs before the re-render that
  // enables it again, so the focus move waits until the form is editable.
  useEffect(() => {
    if (!isPending && focusRequest) setFocus(focusRequest);
  }, [isPending, focusRequest, setFocus]);

  async function onSubmit(values: CreatePostFormData) {
    if (isPending) return;
    setFormError(null);
    setPublishedSlug(null);
    setFocusRequest(null);
    try {
      const post = await mutateAsync(buildCreatePostRequest(values));
      reset(emptyFormValues());
      setPublishedSlug(post.slug);
      onPublished?.();
    } catch (error: unknown) {
      const { fields, form } = getCreatePostError(error);
      const rejected = CREATE_POST_FIELDS.filter((field) => fields[field]);
      // The rejected category is gone: forget it, so the form cannot resend the same id.
      if (fields.categoryId) setValue('categoryId', '');
      for (const field of rejected) {
        setError(field, { type: 'server', message: fields[field] });
      }
      if (rejected.length > 0 && rejected[0] !== 'tags') setFocusRequest(rejected[0]);
      if (fields.categoryId) {
        // The chosen category is gone: stop offering it right away, then reload the real list.
        queryClient.setQueryData<Category[]>(categoriesQueryKey, (list) =>
          list?.filter((category) => String(category.id) !== values.categoryId)
        );
        void categories.refetch();
      }
      setFormError(form ?? null);
    }
  }

  const categoryList = categories.data ?? [];
  // A failed background refetch keeps the cached list; only an empty result is a problem.
  // While the list reloads (after a rejected category) an empty cache is not yet a verdict.
  const categoriesUnavailable =
    categoryList.length === 0 && !categories.isPending && !categories.isFetching;

  // One message at a time: while the list is unavailable it replaces a validation error, and the
  // select references this single node. The retry button only makes sense after a failed request.
  const categoryProblem = categoriesUnavailable ? (
    <>
      {categories.isError ? CATEGORIES_ERROR_MESSAGE : CATEGORIES_EMPTY_MESSAGE}
      {categories.isError && (
        <>
          {' '}
          <button
            type="button"
            onClick={() => categories.refetch()}
            className="font-semibold underline"
          >
            Try again
          </button>
        </>
      )}
    </>
  ) : (
    errors.categoryId?.message
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Create a post"
      className="flex flex-col gap-4"
    >
      {publishedSlug && (
        <div
          role="status"
          className="flex flex-col gap-0.5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-emerald-900">Post published!</p>
          <p className="text-xs text-emerald-700">
            Your post is now live and visible to the community.{' '}
            <Link
              href={`/forum/${publishedSlug}`}
              onClick={onViewPost}
              className="text-sm font-semibold text-emerald-700 underline"
            >
              View post →
            </Link>
          </p>
        </div>
      )}

      {formError && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      <FormField
        label="Title"
        id={ids.title}
        required
        counter={{ used: title.trim().length, max: TITLE_MAX_LENGTH }}
        error={errors.title?.message}
      >
        <input
          {...register('title')}
          {...getFieldControlProps({ id: ids.title, hasError: Boolean(errors.title?.message) })}
          type="text"
          placeholder="Give your post a clear title"
          readOnly={isPending}
          className={inputClass(Boolean(errors.title))}
        />
      </FormField>

      <FormField label="Category" id={ids.category} required error={categoryProblem}>
        <select
          {...register('categoryId')}
          {...getFieldControlProps({
            id: ids.category,
            hasError: Boolean(categoryProblem),
            invalid: Boolean(errors.categoryId),
          })}
          disabled={isPending || categories.isPending || categoriesUnavailable}
          className={inputClass(Boolean(errors.categoryId))}
        >
          <option value="">
            {categories.isPending ? 'Loading categories…' : 'Select a category'}
          </option>
          {categoryList.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Body"
        id={ids.content}
        required
        counter={{ used: content.trim().length, max: CONTENT_MAX_LENGTH }}
        error={errors.content?.message}
      >
        <textarea
          {...register('content')}
          {...getFieldControlProps({ id: ids.content, hasError: Boolean(errors.content?.message) })}
          rows={8}
          placeholder="Share your thoughts…"
          readOnly={isPending}
          className={cn(inputClass(Boolean(errors.content)), 'resize-y')}
        />
      </FormField>

      <Controller
        control={control}
        name="tags"
        render={({ field }) => (
          <TagInput
            tags={field.value}
            onChange={field.onChange}
            serverError={errors.tags?.message}
            disabled={isPending}
          />
        )}
      />

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValid || isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isPending ? 'Publishing…' : 'Publish post'}
        </button>
      </div>
    </form>
  );
}
