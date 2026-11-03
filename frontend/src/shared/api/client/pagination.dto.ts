import type { PagedResponsePostSummaryDto } from '@/shared/api/generated/models/pagedResponsePostSummaryDto.dto';

/** Provisional pages (comments/notifications) reuse the verified envelope until their contracts exist. */
export type PagedResponse<T> = Omit<PagedResponsePostSummaryDto, 'content'> & { content: T[] };
