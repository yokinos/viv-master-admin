import type { VivApiRequest } from '@/api/vivapirequest';

/**
 * 后端下发的路由节点（`VueMenuRouteAdapter` 的产物）。
 *
 * ⚠️ 后端字段是 PascalCase 序列化成 camelCase 的：`title/icon/orderNo/hidden/keepAlive`。
 * 目录节点 `component` 固定是 `"LAYOUT"`，其余是 `/pages` 下的相对路径（如 `/dashboard/base/index`）。
 */
export interface BackendRouteItem {
  path: string;
  name?: string;
  component?: string;
  redirect?: string;
  meta?: {
    title?: string;
    icon?: string;
    orderNo?: number;
    hidden?: boolean;
    keepAlive?: boolean;
  };
  children?: BackendRouteItem[];
}

export interface LoginDataUser {
  /** long → 字符串 */
  userId: string;
  userName: string;
  avatarUrl: string;
  isSuperAdmin: boolean;
  phone: string;
  nickname: string;
  userType: number;
}

export interface LoginDataSubject {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
}

export interface LoginDataButton {
  /** 按钮标识，前端用 hasPermission 判断 */
  code?: string;
  name?: string;
  [key: string]: unknown;
}

export interface LoginDataButtonGroup {
  menuId: string;
  buttons: LoginDataButton[];
}

/** `POST /User/getLoginData` 的返回 */
export interface GetLoginDataResult {
  user: LoginDataUser;
  subjectInfo?: LoginDataSubject | null;
  /** 后端给的是 object，实际是 Vue Router 树 */
  routes: BackendRouteItem[] | null;
  buttonList: LoginDataButtonGroup[];
}

/** 请求体只有 version（由 request 层注入），这里保留类型占位 */
export type GetLoginDataParams = VivApiRequest;
