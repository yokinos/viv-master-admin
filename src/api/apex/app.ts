import type {
  ApiIdParams,
  AppMenuPageParams,
  AppMenuRow,
  AppPageParams,
  ClientAppListItem,
  ClientAppPage,
  DeleteAppMenuActionParams,
  DeleteAppMenuParams,
  DeleteAppMenuSubPageParams,
  MenuOption,
  PagedResult,
  SaveAppMenuActionParams,
  SaveAppMenuParams,
  SaveAppMenuSubPageParams,
  SaveAppParams,
  SaveAppResult,
} from '@/api/model/apex/appModel';
import { Service } from '@/api/services';
import { request } from '@/utils/request';

const Api = {
  Page: `${Service.apex}/App/getAppPage`,
  Save: `${Service.apex}/App/saveApp`,
  GetApp: `${Service.apex}/App/getApp`,
  MenuOptions: `${Service.apex}/App/getMenuOptions`,
  PageMenu: `${Service.apex}/App/getMenuPage`,
  SaveMenu: `${Service.apex}/App/saveMenu`,
  DeleteMenu: `${Service.apex}/App/deleteMenu`,
  SaveMenuAction: `${Service.apex}/App/saveMenuAction`,
  DeleteMenuAction: `${Service.apex}/App/deleteMenuAction`,
  SaveMenuSubPage: `${Service.apex}/App/saveMenuSubPage`,
  DeleteMenuSubPage: `${Service.apex}/App/deleteMenuSubPage`,
};

/** 应用分页。关键字匹配名称或 AppKey，响应不含密钥 */
export function pageApps(data: Omit<AppPageParams, 'version'>) {
  return request.post<ClientAppPage>({
    url: Api.Page,
    data,
  });
}

/** 新增或更新应用。Id 为 `"0"` 是新增，密钥只在新增的返回里出现一次 */
export function saveApp(data: Omit<SaveAppParams, 'version'>) {
  return request.post<SaveAppResult>({
    url: Api.Save,
    data,
  });
}

/** 按 Id 取单个应用（不含密钥） */
export function getApp(data: Omit<ApiIdParams, 'version'>) {
  return request.post<ClientAppListItem>({
    url: Api.GetApp,
    data,
  });
}

/** 指定应用的上级菜单候选项 */
export function getMenuOptions(data: Omit<ApiIdParams, 'version'>) {
  return request.post<MenuOption[]>({
    url: Api.MenuOptions,
    data,
  });
}

/** 指定应用的菜单分页，行上带子页面与动作 */
export function pageAppMenus(data: Omit<AppMenuPageParams, 'version'>) {
  return request.post<PagedResult<AppMenuRow>>({
    url: Api.PageMenu,
    data,
  });
}

/** 给指定应用新增或更新菜单。Id 为 `"0"` 是新增 */
export function saveAppMenu(data: Omit<SaveAppMenuParams, 'version'>) {
  return request.post<void>({
    url: Api.SaveMenu,
    data,
  });
}

/** 删除指定应用下的菜单。有子菜单时后端拒绝 */
export function deleteAppMenu(data: Omit<DeleteAppMenuParams, 'version'>) {
  return request.post<void>({
    url: Api.DeleteMenu,
    data,
  });
}

/** 给指定应用的页面菜单新增或更新动作（权限点）。Id 为 `"0"` 是新增 */
export function saveAppMenuAction(data: Omit<SaveAppMenuActionParams, 'version'>) {
  return request.post<void>({
    url: Api.SaveMenuAction,
    data,
  });
}

/** 删除指定应用下的菜单动作 */
export function deleteAppMenuAction(data: Omit<DeleteAppMenuActionParams, 'version'>) {
  return request.post<void>({
    url: Api.DeleteMenuAction,
    data,
  });
}

/** 给指定应用的页面菜单新增或更新子页面。Id 为 `"0"` 是新增 */
export function saveAppMenuSubPage(data: Omit<SaveAppMenuSubPageParams, 'version'>) {
  return request.post<void>({
    url: Api.SaveMenuSubPage,
    data,
  });
}

/** 删除指定应用下的子页面 */
export function deleteAppMenuSubPage(data: Omit<DeleteAppMenuSubPageParams, 'version'>) {
  return request.post<void>({
    url: Api.DeleteMenuSubPage,
    data,
  });
}
