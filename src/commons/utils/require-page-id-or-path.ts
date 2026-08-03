import { UserError } from 'fastmcp';

/**
 * Throws when neither `pageId` nor `path` is provided.
 *
 * This cross-field check lives here and is called from each tool's register layer instead of
 * being expressed as a zod schema `.refine()`: fastmcp requires `parameters` to be a plain
 * `z.object`, and a top-level `.refine()` wraps the schema in `ZodEffects`, which fastmcp does
 * not accept there.
 * @param params - The parsed tool parameters to check
 * @param params.pageId - ID of the GROWI page, if provided
 * @param params.path - Path of the GROWI page, if provided
 * @throws UserError if both `pageId` and `path` are missing
 */
export const requirePageIdOrPath = (params: { pageId?: string; path?: string }): void => {
  if (params.pageId == null && params.path == null) {
    throw new UserError('Either pageId or path must be provided');
  }
};
