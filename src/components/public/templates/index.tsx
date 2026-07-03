import DefaultTemplate from './DefaultTemplate';
import ModernTemplate from './ModernTemplate';
import MinimalTemplate from './MinimalTemplate';
import GalaTemplate from './GalaTemplate';

export const templates = {
  default: DefaultTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,
  gala: GalaTemplate,
};

export type TemplateType = keyof typeof templates;
