import type { IRevision, IRevisionHasId, IRevisionsForPagination } from '@growi/core';
import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../commons/api/growi-api-error.js';
import { type IRevisionService, tokenRevisionService } from '../services/revision-service.js';

const getRevisionSchema = z.object({
  id: z.string().describe('ID of the revision to get'),
});

const getRevisionsSchema = z
  .object({
    pageId: z.string().optional().describe('ID of the page to get revisions for'),
    limit: z.number().int().min(1).optional().describe('Maximum number of revisions to return'),
    offset: z.number().int().min(0).optional().describe('Number of revisions to skip'),
  })
  .describe('Parameters for getting page revisions');

export function registerGetRevisionTool(server: FastMCP): void {
  const revisionService = container.resolve<IRevisionService>(tokenRevisionService);

  server.addTool({
    name: 'getRevision',
    description: 'Get a specific revision from GROWI',
    parameters: getRevisionSchema,
    execute: async (args) => {
      const params = getRevisionSchema.parse(args);
      try {
        const response = await revisionService.getRevision(params.id);
        // Convert date strings to Date objects to match IRevisionHasId type
        response.revision.createdAt = new Date(response.revision.createdAt);
        // Use createdAt as updatedAt if updatedAt is not provided
        response.revision.updatedAt = new Date(response.revision.updatedAt ?? response.revision.createdAt);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to get revision: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}

export function registerGetRevisionsTool(server: FastMCP): void {
  const revisionService = container.resolve<IRevisionService>(tokenRevisionService);

  server.addTool({
    name: 'getRevisions',
    description: 'Get revision list from GROWI',
    parameters: getRevisionsSchema,
    execute: async (args) => {
      const params = getRevisionsSchema.parse(args);
      try {
        const response = await revisionService.getRevisions(params);
        // Convert date strings to Date objects for each revision to match IRevisionHasId type
        response.revisions = response.revisions.map((revision) => ({
          ...revision,
          createdAt: new Date(revision.createdAt),
          // Use createdAt as updatedAt if updatedAt is not provided
          updatedAt: new Date(revision.updatedAt ?? revision.createdAt),
        }));
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(
            `Failed to get revisions: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`,
          );
        }
        throw error;
      }
    },
  });
}
