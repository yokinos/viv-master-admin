import type { VivApiRequest } from '@/api/vivapirequest';

/** `EmMenuType`：目录没有自己的页面，页面能跳转 */
export const MenuType = {
  Directory: 0,
  Page: 1,
} as const;

/** `EmStatus`：0 启用，1 停用 */
export const AppStatus = {
  Enabled: 0,
  Disabled: 1,
} as const;

/** `EmClientStack.Vue`。目前只有 Vue 有菜单适配器 */
export const ClientStackVue = 0;

/** `POST /App/getAppPage` 的一行。long 是字符串 */
export interface ClientAppListItem {
  id: string;
  appKey: string;
  name: string;
  platform: number;
  clientStack: number;
  source: number;
  status: number;
  packageName: string;
  bundleId: string;
  remark: string;
}

/** 标准分页对象（对应后端 PagedList<T>） */
export interface PagedResult<T> {
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  /** long → 字符串 */
  totalCount: string;
  isHaveFrontPage: boolean;
  isHaveNextPage: boolean;
  items: T[];
}

export type ClientAppPage = PagedResult<ClientAppListItem>;

export interface AppPageParams extends VivApiRequest {
  pageIndex: number;
  pageSize: number;
  keyword?: string;
}

/** Id 为 `"0"` 是新增。密钥由服务生成，请求里不带 */
export interface SaveAppParams extends VivApiRequest {
  id: string;
  name: string;
  appKey: string;
  platform: number;
  clientStack: number;
  source: number;
  status: number;
  packageName?: string;
  bundleId?: string;
  remark?: string;
}

export interface SaveAppResult {
  id: string;
  /** 只在新增时有值 */
  appSecret?: string | null;
}

/** 后台菜单动作（权限点）。只挂在页面菜单下 */
export interface MenuActionNode {
  id: string;
  menuId: string;
  name: string;
  sort: number;
  remark: string;
  status: number;
}

/** 上级菜单候选项。只带组树需要的字段 */
export interface MenuOption {
  id: string;
  parentId: string;
  title: string;
  sort: number;
  type: number;
}

/** 按 Id 取数据 */
export interface ApiIdParams extends VivApiRequest {
  id: string;
}

/** Id 为 `"0"` 是新增 */
export interface SaveAppMenuParams extends VivApiRequest {
  clientAppId: string;
  id: string;
  parentId: string;
  title: string;
  type: number;
  icon?: string;
  sort: number;
  isVisible: boolean;
  routeConfig?: string | null;
  description?: string;
  status: number;
}

export interface DeleteAppMenuParams extends VivApiRequest {
  clientAppId: string;
  id: string;
}

/** Id 为 `"0"` 是新增 */
export interface SaveAppMenuActionParams extends VivApiRequest {
  clientAppId: string;
  id: string;
  menuId: string;
  name: string;
  sort: number;
  remark?: string;
  status: number;
}

export interface DeleteAppMenuActionParams extends VivApiRequest {
  clientAppId: string;
  id: string;
}

/** 后台子页面。只挂在页面菜单下 */
export interface MenuSubPageNode {
  id: string;
  menuId: string;
  title: string;
  sort: number;
  isVisible: boolean;
  routeConfig: string;
  remark: string;
  status: number;
}

/** 菜单分页的一行。子页面与动作直接挂在行上 */
export interface AppMenuRow {
  id: string;
  parentId: string;
  parentTitle: string;
  title: string;
  type: number;
  icon: string;
  sort: number;
  isVisible: boolean;
  routeConfig: string;
  description: string;
  status: number;
  /** 下级菜单数量，有下级时不允许删除 */
  childCount: number;
  subPages: MenuSubPageNode[];
  actions: MenuActionNode[];
}

export interface AppMenuPageParams extends VivApiRequest {
  clientAppId: string;
  pageIndex: number;
  pageSize: number;
  keyword?: string;
}

/** Id 为 `"0"` 是新增 */
export interface SaveAppMenuSubPageParams extends VivApiRequest {
  clientAppId: string;
  id: string;
  menuId: string;
  title: string;
  routeConfig?: string | null;
  sort: number;
  isVisible: boolean;
  remark?: string;
  status: number;
}

export interface DeleteAppMenuSubPageParams extends VivApiRequest {
  clientAppId: string;
  id: string;
}
