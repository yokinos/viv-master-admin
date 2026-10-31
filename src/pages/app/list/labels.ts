import { t } from '@/locales';

export const platformValues = [0, 1, 2, 3, 4, 5, 6];
export const stackValues = [0, 1, 2, 3, 10, 11, 12, 13, 14, 15, 20, 21, 22, 30, 31, 32, 33];
export const sourceValues = [0, 1, 3];

/** 枚举文案走 i18n。缺翻译时退回数字，避免页面上冒出 key */
export function enumLabel(group: 'platform' | 'stack' | 'source', value: number) {
  const key = `pages.app.${group}.${value}`;
  const text = t(key);
  return text === key ? String(value) : text;
}

export interface VueRouteDraft {
  path: string;
  name: string;
  component: string;
  redirect: string;
  keepAlive: boolean;
}

export function emptyRouteDraft(): VueRouteDraft {
  return { path: '', name: '', component: '', redirect: '', keepAlive: true };
}

/**
 * 拆开 `RouteConfig`。适配器运行时会用菜单列覆盖 title/icon/orderNo/hidden，
 * 表单只编辑 path/name/component/redirect/keepAlive，其余字段原样留着。
 */
export function parseRouteConfig(raw?: string | null): {
  draft: VueRouteDraft;
  original: Record<string, unknown> | null;
  invalid: boolean;
} {
  const draft = emptyRouteDraft();
  if (!raw?.trim()) return { draft, original: null, invalid: false };

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    draft.path = asText(parsed.path);
    draft.name = asText(parsed.name);
    draft.component = asText(parsed.component);
    draft.redirect = asText(parsed.redirect);
    const meta = isRecord(parsed.meta) ? parsed.meta : undefined;
    if (typeof meta?.keepAlive === 'boolean') draft.keepAlive = meta.keepAlive;
    return { draft, original: parsed, invalid: false };
  } catch {
    return { draft, original: null, invalid: true };
  }
}

/** 目录的 component 运行时固定是 LAYOUT，不写进 JSON */
export function buildRouteConfig(
  draft: VueRouteDraft,
  isPage: boolean,
  original: Record<string, unknown> | null,
): string | null {
  const next: Record<string, unknown> = { ...(original ?? {}) };
  delete next.children;

  assignText(next, 'path', draft.path);
  assignText(next, 'name', draft.name);
  assignText(next, 'component', isPage ? draft.component : '');
  assignText(next, 'redirect', draft.redirect);

  const meta = isRecord(next.meta) ? { ...next.meta } : {};
  delete meta.title;
  delete meta.icon;
  delete meta.orderNo;
  delete meta.hidden;
  if (draft.keepAlive) delete meta.keepAlive;
  else meta.keepAlive = false;

  if (Object.keys(meta).length) next.meta = meta;
  else delete next.meta;

  return Object.keys(next).length ? JSON.stringify(next) : null;
}

function assignText(target: Record<string, unknown>, key: string, value: string) {
  const text = value.trim();
  if (text) target[key] = text;
  else delete target[key];
}

function asText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
