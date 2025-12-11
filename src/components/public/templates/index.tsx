import DefaultTemplate from './DefaultTemplate';
import ModernTemplate from './ModernTemplate';
import MinimalTemplate from './MinimalTemplate';

export const templates = {
  default: DefaultTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,
};

export type TemplateType = keyof typeof templates;
