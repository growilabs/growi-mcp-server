import type { IPage } from '@growi/core/dist/interfaces';
import { container } from 'tsyringe';
import { type IPageService, tokenPageService } from './page-service.js';

export const tokenGrowiService = 'GrowiService';

export interface IGrowiService {
  getPage(pagePath: string): Promise<IPage>;
}

/**
 * @deprecated Use PageService directly instead. This service is kept for backward compatibility.
 */
class GrowiService implements IGrowiService {
  private readonly pageService: IPageService;

  constructor() {
    this.pageService = container.resolve<IPageService>(tokenPageService);
  }

  async getPage(pagePath: string): Promise<IPage> {
    return this.pageService.getPage(pagePath);
  }
}

container.registerSingleton(tokenGrowiService, GrowiService);
