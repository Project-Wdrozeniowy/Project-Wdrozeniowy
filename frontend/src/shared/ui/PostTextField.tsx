import type { UseFormRegisterReturn } from 'react-hook-form';
import { TITLE_MAX_LENGTH, CONTENT_MAX_LENGTH } from '@/shared/constants/postText.const';
import { cn } from '@/shared/lib/cn';
import FormField from '@/shared/ui/FormField';
import { getFieldControlProps } from '@/shared/ui/fieldA11y';

interface PostTextFieldProps {
  kind: 'title' | 'content';
  id: string;
  registration: UseFormRegisterReturn;
  used: number;
  error?: string;
  readOnly: boolean;
}

/** Presentation only: callers own validation and the exact text submitted to the API. */
export default function PostTextField({
  kind,
  id,
  registration,
  used,
  error,
  readOnly,
}: PostTextFieldProps) {
  const title = kind === 'title';
  const props = {
    ...registration,
    ...getFieldControlProps({ id, hasError: Boolean(error), required: true }),
    readOnly,
    className: cn('input', error && 'ring-2 ring-red-500', !title && 'resize-y'),
    placeholder: title ? 'Give your post a clear title' : 'Share your thoughts…',
  };
  return (
    <FormField
      label={title ? 'Title' : 'Body'}
      id={id}
      required
      counter={{ used, max: title ? TITLE_MAX_LENGTH : CONTENT_MAX_LENGTH }}
      error={error}
    >
      {title ? <input {...props} type="text" /> : <textarea {...props} rows={8} />}
    </FormField>
  );
}
