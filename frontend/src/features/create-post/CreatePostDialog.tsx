import { useIsMutating } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { CreatePostForm } from '@/features/create-post/CreatePostForm';
import { getCreatePostMutationKey } from '@/shared/api/generated/orbita.api';
import PostDialog from '@/shared/ui/PostDialog';
interface CreatePostDialogProps {
  open: boolean;
  onClose: () => void;
}
export function CreatePostDialog({ open, onClose }: CreatePostDialogProps) {
  const publishing = useIsMutating({ mutationKey: getCreatePostMutationKey() }) > 0;
  const [formKey, setFormKey] = useState(0);
  const publishedRef = useRef(false);
  const [everOpened, setEverOpened] = useState(open);
  if (open && !everOpened) setEverOpened(true);
  function close() {
    if (publishing) return;
    if (publishedRef.current) {
      publishedRef.current = false;
      setFormKey((key) => key + 1);
    }
    onClose();
  }
  if (!everOpened) return null;
  return (
    <PostDialog
      open={open}
      busy={publishing}
      title="Create a post"
      description="Share your thoughts with the community"
      onClose={close}
    >
      <CreatePostForm
        key={formKey}
        onCancel={close}
        onViewPost={close}
        onPublished={() => {
          publishedRef.current = true;
        }}
      />
    </PostDialog>
  );
}
