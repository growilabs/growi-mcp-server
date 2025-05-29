import { type FastMCP, UserError } from 'fastmcp';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { registerUserSchema } from './schema.js';
import { registerUser } from './service.js';

export function registerRegisterUserTool(server: FastMCP): void {
  server.addTool({
    name: 'register',
    description: 'Register a new user account in GROWI',
    parameters: registerUserSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
      title: 'Register User',
    },
    execute: async (params, context) => {
      try {
        const response = await registerUser(params);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new UserError(`ユーザー登録に失敗しました: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        throw new UserError('ユーザー登録に失敗しました。しばらく時間をおいて再度お試しください。');
      }
    },
  });
}
