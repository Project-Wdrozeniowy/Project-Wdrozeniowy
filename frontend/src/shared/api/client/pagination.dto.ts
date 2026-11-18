import type { PagedResponsePostSummaryDto } from '@/shared/api/generated/models/pagedResponsePostSummaryDto.dto';

/** Generic page derived from the published envelope; provisional comment/tag adapters reuse it. */
export type PagedResponse<T> = Omit<PagedResponsePostSummaryDto, 'content'> & { content: T[] };
