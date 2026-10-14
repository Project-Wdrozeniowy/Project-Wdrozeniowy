'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
import { createPostSchema } from '@/features/create-post/createPost.schema';
import type { CreatePostFormData } from '@/features/create-post/createPost.schema';
import { FieldLabel } from '@/features/create-post/FieldLabel';
import { TagInput } from '@/features/create-post/TagInput';
import { useCategories } from '@/shared/api/forum/useCategories';
import { useCreatePost } from '@/shared/api/forum/useCreatePost';
import { cn } from '@/shared/lib/cn';

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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-red-500">
      {message}
    </p>
  );
}

export function CreatePostForm({ onCancel, onViewPost, onPublished }: CreatePostFormProps) {
  const categories = useCategories();
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

  async function onSubmit(values: CreatePostFormData) {
    if (isPending) return;
    setFormError(null);
    setPublishedSlug(null);
    try {
      const post = await mutateAsync(buildCreatePostRequest(values));
      reset(emptyFormValues());
      setPublishedSlug(post.slug);
      onPublished?.();
    } catch (error: unknown) {
      const { fields, form } = getCreatePostError(error);
      const rejected = CREATE_POST_FIELDS.filter((field) => fields[field]);
      for (const field of rejected) {
        setError(field, { type: 'server', message: fields[field] });
      }
      if (rejected.length > 0 && rejected[0] !== 'tags') setFocus(rejected[0]);
      setFormError(form ?? null);
    }
  }

  const categoryList = categories.data ?? [];
  const categoriesUnavailable =
    categories.isError || (categories.isSuccess && categoryList.length === 0);

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

      <div className="flex flex-col gap-1.5">
        <FieldLabel
          htmlFor="create-post-title"
          label="Title"
          required
          counter={{ used: title.trim().length, max: TITLE_MAX_LENGTH }}
        />
        <input
          {...register('title')}
          id="create-post-title"
          type="text"
          placeholder="Give your post a clear title"
          readOnly={isPending}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'create-post-title-error' : undefined}
          className={inputClass(Boolean(errors.title))}
        />
        <FieldError id="create-post-title-error" message={errors.title?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="create-post-category" label="Category" required />
        <select
          {...register('categoryId')}
          id="create-post-category"
          disabled={isPending || categories.isPending || categoriesUnavailable}
          aria-invalid={Boolean(errors.categoryId)}
          aria-describedby={
            errors.categoryId || categoriesUnavailable ? 'create-post-category-error' : undefined
          }
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
        <FieldError
          id="create-post-category-error"
          message={categoriesUnavailable ? undefined : errors.categoryId?.message}
        />
        {categoriesUnavailable && (
          <p id="create-post-category-error" role="alert" className="text-xs text-red-500">
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
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel
          htmlFor="create-post-content"
          label="Body"
          required
          counter={{ used: content.trim().length, max: CONTENT_MAX_LENGTH }}
        />
        <textarea
          {...register('content')}
          id="create-post-content"
          rows={8}
          placeholder="Share your thoughts…"
          readOnly={isPending}
          aria-invalid={Boolean(errors.content)}
          aria-describedby={errors.content ? 'create-post-content-error' : undefined}
          className={cn(inputClass(Boolean(errors.content)), 'resize-y')}
        />
        <FieldError id="create-post-content-error" message={errors.content?.message} />
      </div>

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
