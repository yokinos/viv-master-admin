<template>
  <div>
    <t-card class="list-card-container" :bordered="false">
      <div class="toolbar">
        <div class="toolbar-title">
          <t-button variant="text" @click="back">
            <template #icon>
              <chevron-left-icon />
            </template>
            {{ t('pages.app.menu.back') }}
          </t-button>
          <span class="title">{{ heading }}</span>
          <t-tag v-if="appKey" variant="outline">{{ appKey }}</t-tag>
        </div>
        <t-space>
          <t-input
            v-model="query.keyword"
            class="keyword"
            :placeholder="t('pages.app.menu.keyword')"
            clearable
            @enter="search"
            @clear="search"
          />
          <t-button theme="default" variant="outline" :loading="loading" :disabled="!clientAppId" @click="search">
            {{ t('pages.app.list.search') }}
          </t-button>
          <t-button :disabled="!clientAppId || !adapterReady" @click="openCreate('0')">
            {{ t('pages.app.menu.create') }}
          </t-button>
        </t-space>
      </div>

      <t-alert v-if="clientAppId && !adapterReady && !loading" theme="warning" class="stack-alert">
        {{ t('pages.app.menu.noAdapter') }}
      </t-alert>
      <t-alert v-if="!clientAppId" theme="warning">
        {{ t('pages.app.menu.missingApp') }}
      </t-alert>

      <template v-else>
        <t-table row-key="id" :data="rows" :columns="columns" :hover="true" :loading="loading" vertical-align="middle">
          <template #type="{ row }">
            {{ row.type === MenuType.Directory ? t('pages.app.menu.directory') : t('pages.app.menu.page') }}
          </template>
          <template #path="{ row }">
            <span class="mono">{{ routePath(row.routeConfig) }}</span>
          </template>
          <template #isVisible="{ row }">
            {{ row.isVisible ? t('pages.app.menu.visible') : t('pages.app.menu.hidden') }}
          </template>
          <template #status="{ row }">
            <t-tag :theme="row.status === AppStatus.Enabled ? 'success' : 'default'" variant="light">
              {{ row.status === AppStatus.Enabled ? t('pages.app.list.enabled') : t('pages.app.list.disabled') }}
            </t-tag>
          </template>
          <template #subPageCount="{ row }">
            {{ row.type === MenuType.Page ? row.subPages.length : '—' }}
          </template>
          <template #actionCount="{ row }">
            {{ row.type === MenuType.Page ? row.actions.length : '—' }}
          </template>
          <template #op="{ row }">
            <t-space>
              <t-link v-if="row.type === MenuType.Page" theme="primary" @click="openDetail(row)">
                {{ t('pages.app.menu.manage') }}
              </t-link>
              <t-link theme="primary" :disabled="!adapterReady" @click="openCreate(row.id)">
                {{ t('pages.app.menu.addChild') }}
              </t-link>
              <t-link theme="primary" :disabled="!adapterReady" @click="openEdit(row)">
                {{ t('pages.app.menu.edit') }}
              </t-link>
              <t-tooltip :content="row.childCount > 0 ? t('pages.app.menu.childBlocked') : ''">
                <t-link theme="danger" :disabled="!adapterReady || row.childCount > 0" @click="askDeleteMenu(row)">
                  {{ t('pages.app.menu.delete') }}
                </t-link>
              </t-tooltip>
            </t-space>
          </template>
        </t-table>

        <t-pagination
          v-if="pagination.total > 0"
          v-model="pagination.current"
          v-model:page-size="pagination.pageSize"
          class="pager"
          :total="pagination.total"
          :page-size-options="[10, 20, 50]"
          @change="onPage"
        />
      </template>
    </t-card>

    <t-drawer
      v-model:visible="drawerVisible"
      :header="form.id === '0' ? t('pages.app.menu.create') : t('pages.app.menu.edit')"
      size="560px"
      :close-on-overlay-click="false"
      :confirm-btn="{ loading: saving, content: t('pages.app.menu.save') }"
      :cancel-btn="t('pages.app.menu.cancel')"
      @confirm="submit"
    >
      <t-form label-align="top">
        <t-form-item :label="t('pages.app.menu.parent')">
          <t-select v-model="form.parentId" :options="parents" />
        </t-form-item>
        <t-form-item :label="t('pages.app.menu.title')" required-mark>
          <t-input v-model="form.title" :maxlength="100" />
        </t-form-item>
        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item :label="t('pages.app.menu.type')">
              <t-radio-group v-model="form.type">
                <t-radio :value="MenuType.Directory">{{ t('pages.app.menu.directory') }}</t-radio>
                <t-radio :value="MenuType.Page">{{ t('pages.app.menu.page') }}</t-radio>
              </t-radio-group>
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item :label="t('pages.app.menu.status')">
              <t-radio-group v-model="form.status">
                <t-radio :value="AppStatus.Enabled">{{ t('pages.app.list.enabled') }}</t-radio>
                <t-radio :value="AppStatus.Disabled">{{ t('pages.app.list.disabled') }}</t-radio>
              </t-radio-group>
            </t-form-item>
          </t-col>
        </t-row>
        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item :label="t('pages.app.menu.icon')">
              <t-input v-model="form.icon" :maxlength="500" :placeholder="t('pages.app.menu.iconPlaceholder')" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item :label="t('pages.app.menu.sort')">
              <t-input-number v-model="form.sort" :min="0" theme="column" />
            </t-form-item>
          </t-col>
        </t-row>
        <t-form-item :label="t('pages.app.menu.visibleLabel')">
          <t-switch v-model="form.isVisible" />
        </t-form-item>
        <t-form-item :label="t('pages.app.menu.description')">
          <t-textarea v-model="form.description" :maxlength="500" />
        </t-form-item>

        <div class="section">{{ t('pages.app.menu.route') }}</div>
        <p class="hint">
          {{ form.type === MenuType.Directory ? t('pages.app.menu.directoryHint') : t('pages.app.menu.pageHint') }}
        </p>
        <t-form-item :label="t('pages.app.menu.path')" required-mark>
          <t-input v-model="form.path" :placeholder="t('pages.app.menu.pathPlaceholder')" />
        </t-form-item>
        <t-form-item :label="t('pages.app.menu.routeName')">
          <t-input v-model="form.routeName" />
        </t-form-item>
        <t-form-item v-if="form.type === MenuType.Page" :label="t('pages.app.menu.component')" required-mark>
          <t-input v-model="form.component" :placeholder="t('pages.app.menu.componentPlaceholder')" />
        </t-form-item>
        <t-form-item :label="t('pages.app.menu.redirect')">
          <t-input v-model="form.redirect" />
        </t-form-item>
        <t-form-item :label="t('pages.app.menu.keepAlive')">
          <t-switch v-model="form.keepAlive" />
        </t-form-item>
      </t-form>
    </t-drawer>

    <t-drawer
      v-model:visible="detailVisible"
      :header="detailTitle"
      size="920px"
      :footer="false"
      :close-on-overlay-click="false"
    >
      <t-loading :loading="detailLoading">
        <div class="section-head">
          <span class="section">{{ t('pages.app.menu.subPageList') }}</span>
          <t-button size="small" variant="outline" :disabled="!adapterReady" @click="openSubPageCreate">
            {{ t('pages.app.menu.subPageCreate') }}
          </t-button>
        </div>
        <t-empty v-if="!detailSubPages.length" :description="t('pages.app.menu.emptySubPage')" />
        <t-table v-else row-key="id" size="small" :data="detailSubPages" :columns="subPageColumns">
          <template #path="{ row }">
            <span class="mono">{{ routePath(row.routeConfig) }}</span>
          </template>
          <template #isVisible="{ row }">
            {{ row.isVisible ? t('pages.app.menu.visible') : t('pages.app.menu.hidden') }}
          </template>
          <template #status="{ row }">
            <t-tag :theme="row.status === AppStatus.Enabled ? 'success' : 'default'" variant="light">
              {{ row.status === AppStatus.Enabled ? t('pages.app.list.enabled') : t('pages.app.list.disabled') }}
            </t-tag>
          </template>
          <template #op="{ row }">
            <t-space>
              <t-link theme="primary" @click="openSubPageEdit(row)">{{ t('pages.app.menu.edit') }}</t-link>
              <t-link theme="danger" @click="askDeleteSubPage(row)">{{ t('pages.app.menu.delete') }}</t-link>
            </t-space>
          </template>
        </t-table>

        <div class="section-head">
          <span class="section">{{ t('pages.app.menu.actionList') }}</span>
          <t-button size="small" variant="outline" @click="openActionCreate">
            {{ t('pages.app.menu.actionCreate') }}
          </t-button>
        </div>
        <t-empty v-if="!detailActions.length" :description="t('pages.app.menu.emptyAction')" />
        <t-table v-else row-key="id" size="small" :data="detailActions" :columns="actionColumns">
          <template #status="{ row }">
            <t-tag :theme="row.status === AppStatus.Enabled ? 'success' : 'default'" variant="light">
              {{ row.status === AppStatus.Enabled ? t('pages.app.list.enabled') : t('pages.app.list.disabled') }}
            </t-tag>
          </template>
          <template #op="{ row }">
            <t-space>
              <t-link theme="primary" @click="openActionEdit(row)">{{ t('pages.app.menu.edit') }}</t-link>
              <t-link theme="danger" @click="askDeleteAction(row)">{{ t('pages.app.menu.delete') }}</t-link>
            </t-space>
          </template>
        </t-table>
      </t-loading>
    </t-drawer>

    <t-dialog
      v-model:visible="subPageVisible"
      :header="subPageForm.id === '0' ? t('pages.app.menu.subPageCreate') : t('pages.app.menu.subPageEdit')"
      width="560px"
      :close-on-overlay-click="false"
      :confirm-btn="{ loading: savingSubPage, content: t('pages.app.menu.save') }"
      :cancel-btn="t('pages.app.menu.cancel')"
      @confirm="submitSubPage"
    >
      <t-form label-align="top">
        <t-form-item :label="t('pages.app.menu.subPageName')" required-mark>
          <t-input v-model="subPageForm.title" :maxlength="100" />
        </t-form-item>
        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item :label="t('pages.app.menu.sort')">
              <t-input-number v-model="subPageForm.sort" :min="0" theme="column" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item :label="t('pages.app.menu.status')">
              <t-radio-group v-model="subPageForm.status">
                <t-radio :value="AppStatus.Enabled">{{ t('pages.app.list.enabled') }}</t-radio>
                <t-radio :value="AppStatus.Disabled">{{ t('pages.app.list.disabled') }}</t-radio>
              </t-radio-group>
            </t-form-item>
          </t-col>
        </t-row>
        <t-form-item :label="t('pages.app.menu.visibleLabel')">
          <t-switch v-model="subPageForm.isVisible" />
        </t-form-item>

        <div class="section">{{ t('pages.app.menu.route') }}</div>
        <p class="hint">{{ t('pages.app.menu.subPageHint') }}</p>
        <t-form-item :label="t('pages.app.menu.path')" required-mark>
          <t-input v-model="subPageForm.path" :placeholder="t('pages.app.menu.pathPlaceholder')" />
        </t-form-item>
        <t-form-item :label="t('pages.app.menu.routeName')">
          <t-input v-model="subPageForm.routeName" />
        </t-form-item>
        <t-form-item :label="t('pages.app.menu.component')" required-mark>
          <t-input v-model="subPageForm.component" :placeholder="t('pages.app.menu.componentPlaceholder')" />
        </t-form-item>
        <t-form-item :label="t('pages.app.menu.description')">
          <t-textarea v-model="subPageForm.remark" :maxlength="500" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog
      v-model:visible="actionVisible"
      :header="actionForm.id === '0' ? t('pages.app.menu.actionCreate') : t('pages.app.menu.actionEdit')"
      width="480px"
      :close-on-overlay-click="false"
      :confirm-btn="{ loading: savingAction, content: t('pages.app.menu.save') }"
      :cancel-btn="t('pages.app.menu.cancel')"
      @confirm="submitAction"
    >
      <t-form label-align="top">
        <t-form-item :label="t('pages.app.menu.actionName')" required-mark>
          <t-input v-model="actionForm.name" :maxlength="100" />
        </t-form-item>
        <t-row :gutter="16">
          <t-col :span="6">
            <t-form-item :label="t('pages.app.menu.sort')">
              <t-input-number v-model="actionForm.sort" :min="0" theme="column" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item :label="t('pages.app.menu.status')">
              <t-radio-group v-model="actionForm.status">
                <t-radio :value="AppStatus.Enabled">{{ t('pages.app.list.enabled') }}</t-radio>
                <t-radio :value="AppStatus.Disabled">{{ t('pages.app.list.disabled') }}</t-radio>
              </t-radio-group>
            </t-form-item>
          </t-col>
        </t-row>
        <t-form-item :label="t('pages.app.menu.description')">
          <t-textarea v-model="actionForm.remark" :maxlength="500" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog
      v-model:visible="deleteVisible"
      :header="deleteTitle"
      :body="deleteBody"
      :confirm-btn="{ loading: deleting, theme: 'danger', content: t('pages.app.menu.delete') }"
      @confirm="confirmDelete"
    />
  </div>
</template>
<script setup lang="ts">
import { ChevronLeftIcon } from 'tdesign-icons-vue-next';
import type { PrimaryTableCol, TableRowData } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  deleteAppMenu,
  deleteAppMenuAction,
  deleteAppMenuSubPage,
  getApp,
  getMenuOptions,
  pageAppMenus,
  saveAppMenu,
  saveAppMenuAction,
  saveAppMenuSubPage,
} from '@/api/apex/app';
import type { AppMenuRow, MenuActionNode, MenuOption, MenuSubPageNode } from '@/api/model/apex/appModel';
import { AppStatus, ClientStackVue, MenuType } from '@/api/model/apex/appModel';
import { t } from '@/locales';

import { buildRouteConfig, emptyRouteDraft, parseRouteConfig } from './labels';

defineOptions({
  name: 'AppListMenu',
});

type DeleteKind = 'menu' | 'subPage' | 'action';

interface MenuForm {
  id: string;
  parentId: string;
  title: string;
  type: number;
  icon: string;
  sort: number;
  isVisible: boolean;
  description: string;
  status: number;
  path: string;
  routeName: string;
  component: string;
  redirect: string;
  keepAlive: boolean;
}

interface SubPageForm {
  id: string;
  menuId: string;
  title: string;
  path: string;
  routeName: string;
  component: string;
  sort: number;
  isVisible: boolean;
  remark: string;
  status: number;
}

interface ActionForm {
  id: string;
  menuId: string;
  name: string;
  sort: number;
  remark: string;
  status: number;
}

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const savingSubPage = ref(false);
const savingAction = ref(false);
const detailLoading = ref(false);

const appName = ref('');
const appKey = ref('');
const clientStack = ref(ClientStackVue);
const rows = ref<AppMenuRow[]>([]);
const menuOptions = ref<MenuOption[]>([]);
const query = reactive({ keyword: '' });
const appliedKeyword = ref('');
const pagination = ref({ current: 1, pageSize: 20, total: 0 });

const drawerVisible = ref(false);
const detailVisible = ref(false);
const detailRow = ref<AppMenuRow | null>(null);
const subPageVisible = ref(false);
const actionVisible = ref(false);
const deleteVisible = ref(false);
const pendingDeleteKind = ref<DeleteKind>('menu');
const pendingDeleteId = ref('');
const pendingDeleteName = ref('');

const routeOriginal = ref<Record<string, unknown> | null>(null);
const subPageOriginal = ref<Record<string, unknown> | null>(null);

const form = reactive<MenuForm>(blankForm('0'));
const subPageForm = reactive<SubPageForm>(blankSubPage(''));
const actionForm = reactive<ActionForm>(blankAction(''));

const clientAppId = computed(() => {
  const value = route.query.clientAppId;
  return typeof value === 'string' ? value : '';
});

const adapterReady = computed(() => clientStack.value === ClientStackVue);
const heading = computed(() => appName.value || t('pages.app.menu.titleFallback'));
const detailTitle = computed(() => t('pages.app.menu.detailTitle', { title: detailRow.value?.title ?? '' }));
const detailSubPages = computed(() => detailRow.value?.subPages ?? []);
const detailActions = computed(() => detailRow.value?.actions ?? []);

const columns = computed<PrimaryTableCol<TableRowData>[]>(() => [
  { title: t('pages.app.menu.title'), colKey: 'title', width: 220, ellipsis: true },
  { title: t('pages.app.menu.type'), colKey: 'type', width: 80 },
  { title: t('pages.app.menu.parent'), colKey: 'parentTitle', width: 150, ellipsis: true },
  { title: t('pages.app.menu.path'), colKey: 'path', ellipsis: true },
  { title: t('pages.app.menu.sort'), colKey: 'sort', width: 70 },
  { title: t('pages.app.menu.visibleLabel'), colKey: 'isVisible', width: 90 },
  { title: t('pages.app.menu.status'), colKey: 'status', width: 90 },
  { title: t('pages.app.menu.subPage'), colKey: 'subPageCount', width: 90 },
  { title: t('pages.app.menu.action'), colKey: 'actionCount', width: 80 },
  { title: t('pages.app.list.operation'), colKey: 'op', width: 320, fixed: 'right' },
]);

const subPageColumns = computed<PrimaryTableCol<TableRowData>[]>(() => [
  { title: t('pages.app.menu.title'), colKey: 'title', ellipsis: true },
  { title: t('pages.app.menu.path'), colKey: 'path', ellipsis: true },
  { title: t('pages.app.menu.visibleLabel'), colKey: 'isVisible', width: 80 },
  { title: t('pages.app.menu.sort'), colKey: 'sort', width: 70 },
  { title: t('pages.app.menu.status'), colKey: 'status', width: 90 },
  { title: t('pages.app.list.operation'), colKey: 'op', width: 120 },
]);

const actionColumns = computed<PrimaryTableCol<TableRowData>[]>(() => [
  { title: t('pages.app.menu.actionName'), colKey: 'name', ellipsis: true },
  { title: t('pages.app.menu.sort'), colKey: 'sort', width: 70 },
  { title: t('pages.app.menu.status'), colKey: 'status', width: 90 },
  { title: t('pages.app.list.operation'), colKey: 'op', width: 120 },
]);

const parents = computed(() => {
  // 上级候选从轻量接口拿，平铺列表在这里按 parentId 分组
  const childrenOf = new Map<string, MenuOption[]>();
  menuOptions.value.forEach((item) => {
    const list = childrenOf.get(item.parentId) ?? [];
    list.push(item);
    childrenOf.set(item.parentId, list);
  });

  // 自己和自己的后代不能当上级
  const blocked = new Set<string>();
  if (form.id !== '0') {
    const stack = [form.id];
    while (stack.length) {
      const id = stack.pop() as string;
      if (blocked.has(id)) continue;
      blocked.add(id);
      (childrenOf.get(id) ?? []).forEach((child) => stack.push(child.id));
    }
  }

  const options = [{ label: t('pages.app.menu.root'), value: '0' }];
  const walk = (parentId: string, depth: number) => {
    (childrenOf.get(parentId) ?? []).forEach((item) => {
      if (!blocked.has(item.id)) {
        options.push({ label: `${'\u3000'.repeat(depth)}${item.title}`, value: item.id });
      }
      walk(item.id, depth + 1);
    });
  };
  walk('0', 0);
  return options;
});

const deleteTitle = computed(() => {
  if (pendingDeleteKind.value === 'subPage') return t('pages.app.menu.deleteSubPageConfirm');
  if (pendingDeleteKind.value === 'action') return t('pages.app.menu.deleteActionConfirm');
  return t('pages.app.menu.deleteConfirm');
});

const deleteBody = computed(() => {
  const title = pendingDeleteName.value;
  if (pendingDeleteKind.value === 'subPage') return t('pages.app.menu.deleteSubPageBody', { title });
  if (pendingDeleteKind.value === 'action') return t('pages.app.menu.deleteActionBody', { title });
  return t('pages.app.menu.deleteBody', { title });
});

watch(
  clientAppId,
  () => {
    pagination.value.current = 1;
    loadAppInfo();
    load();
  },
  { immediate: true },
);

function blankForm(parentId: string): MenuForm {
  return {
    id: '0',
    parentId,
    title: '',
    type: parentId === '0' ? MenuType.Directory : MenuType.Page,
    icon: '',
    sort: 0,
    isVisible: true,
    description: '',
    status: AppStatus.Enabled,
    path: '',
    routeName: '',
    component: '',
    redirect: '',
    keepAlive: true,
  };
}

function blankSubPage(menuId: string): SubPageForm {
  return {
    id: '0',
    menuId,
    title: '',
    path: '',
    routeName: '',
    component: '',
    sort: 0,
    isVisible: true,
    remark: '',
    status: AppStatus.Enabled,
  };
}

function blankAction(menuId: string): ActionForm {
  return {
    id: '0',
    menuId,
    name: '',
    sort: 0,
    remark: '',
    status: AppStatus.Enabled,
  };
}

function routePath(raw: string | null | undefined) {
  return parseRouteConfig(raw ?? '').draft.path || '—';
}

function onPage(pageInfo: { current: number; pageSize: number }) {
  pagination.value.current = pageInfo.current;
  pagination.value.pageSize = pageInfo.pageSize;
  load();
}

function search() {
  appliedKeyword.value = query.keyword.trim();
  pagination.value.current = 1;
  load();
}

async function load() {
  if (!clientAppId.value) {
    rows.value = [];
    return;
  }

  loading.value = true;
  try {
    const data = await pageAppMenus({
      clientAppId: clientAppId.value,
      pageIndex: pagination.value.current,
      pageSize: pagination.value.pageSize,
      keyword: appliedKeyword.value || undefined,
    });
    rows.value = data.items ?? [];
    pagination.value.total = Number(data.totalCount) || 0;
    syncDetail();
  } catch (error) {
    MessagePlugin.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

/** 应用信息（名称/AppKey/技术栈）单独取，分页接口只返回标准分页对象 */
async function loadAppInfo() {
  if (!clientAppId.value) {
    appName.value = '';
    appKey.value = '';
    clientStack.value = ClientStackVue;
    return;
  }

  try {
    const app = await getApp({ id: clientAppId.value });
    appName.value = app.name ?? '';
    appKey.value = app.appKey ?? '';
    clientStack.value = app.clientStack ?? ClientStackVue;
  } catch (error) {
    MessagePlugin.error((error as Error).message);
  }
}

/** 上级候选菜单，打开表单时按需取 */
async function ensureMenuOptions() {
  if (!clientAppId.value) return;

  try {
    menuOptions.value = await getMenuOptions({ id: clientAppId.value });
  } catch (error) {
    MessagePlugin.error((error as Error).message);
  }
}

/** 明细抽屉跟着列表刷新，避免保存后还显示旧数据 */
function syncDetail() {
  if (!detailRow.value) return;
  const current = rows.value.find((row) => row.id === detailRow.value?.id);
  if (!current) {
    detailVisible.value = false;
    detailRow.value = null;
    return;
  }
  detailRow.value = current;
}

async function openCreate(parentId: string) {
  await ensureMenuOptions();
  Object.assign(form, blankForm(parentId));
  routeOriginal.value = null;
  drawerVisible.value = true;
}

async function openEdit(row: AppMenuRow) {
  await ensureMenuOptions();

  const parsed = parseRouteConfig(row.routeConfig);
  if (parsed.invalid) MessagePlugin.warning(t('pages.app.menu.routeInvalid'));

  const draft = parsed.invalid ? emptyRouteDraft() : parsed.draft;
  Object.assign(form, {
    id: row.id,
    parentId: row.parentId || '0',
    title: row.title ?? '',
    type: row.type,
    icon: row.icon ?? '',
    sort: row.sort ?? 0,
    isVisible: row.isVisible,
    description: row.description ?? '',
    status: row.status,
    path: draft.path,
    routeName: draft.name,
    component: draft.component,
    redirect: draft.redirect,
    keepAlive: draft.keepAlive,
  });
  routeOriginal.value = parsed.invalid ? null : parsed.original;
  drawerVisible.value = true;
}

function validate(): string | null {
  if (!form.title.trim()) return t('pages.app.menu.titleRequired');
  if (!form.path.trim()) return t('pages.app.menu.pathRequired');
  if (form.type === MenuType.Page && !form.component.trim()) return t('pages.app.menu.componentRequired');
  return null;
}

async function submit() {
  const message = validate();
  if (message) {
    MessagePlugin.warning(message);
    return;
  }

  saving.value = true;
  try {
    await saveAppMenu({
      clientAppId: clientAppId.value,
      id: form.id,
      parentId: form.parentId || '0',
      title: form.title.trim(),
      type: form.type,
      icon: form.icon.trim(),
      sort: form.sort ?? 0,
      isVisible: form.isVisible,
      description: form.description.trim(),
      status: form.status,
      routeConfig: buildRouteConfig(
        {
          path: form.path,
          name: form.routeName,
          component: form.component,
          redirect: form.redirect,
          keepAlive: form.keepAlive,
        },
        form.type === MenuType.Page,
        routeOriginal.value,
      ),
    });
    MessagePlugin.success(t('pages.app.menu.saved'));
    drawerVisible.value = false;
    await load();
  } catch (error) {
    MessagePlugin.error((error as Error).message);
  } finally {
    saving.value = false;
  }
}

function openDetail(row: AppMenuRow) {
  detailRow.value = row;
  detailVisible.value = true;
}

function openSubPageCreate() {
  if (!detailRow.value) return;
  Object.assign(subPageForm, blankSubPage(detailRow.value.id));
  subPageOriginal.value = null;
  subPageVisible.value = true;
}

function openSubPageEdit(subPage: MenuSubPageNode) {
  const parsed = parseRouteConfig(subPage.routeConfig);
  if (parsed.invalid) MessagePlugin.warning(t('pages.app.menu.routeInvalid'));

  const draft = parsed.invalid ? emptyRouteDraft() : parsed.draft;
  Object.assign(subPageForm, {
    id: subPage.id,
    menuId: subPage.menuId,
    title: subPage.title ?? '',
    path: draft.path,
    routeName: draft.name,
    component: draft.component,
    sort: subPage.sort ?? 0,
    isVisible: subPage.isVisible,
    remark: subPage.remark ?? '',
    status: subPage.status,
  });
  subPageOriginal.value = parsed.invalid ? null : parsed.original;
  subPageVisible.value = true;
}

async function submitSubPage() {
  const title = subPageForm.title.trim();
  if (!title) {
    MessagePlugin.warning(t('pages.app.menu.subPageNameRequired'));
    return;
  }
  if (!subPageForm.path.trim()) {
    MessagePlugin.warning(t('pages.app.menu.pathRequired'));
    return;
  }
  if (!subPageForm.component.trim()) {
    MessagePlugin.warning(t('pages.app.menu.componentRequired'));
    return;
  }

  savingSubPage.value = true;
  try {
    await saveAppMenuSubPage({
      clientAppId: clientAppId.value,
      id: subPageForm.id,
      menuId: subPageForm.menuId,
      title,
      sort: subPageForm.sort ?? 0,
      isVisible: subPageForm.isVisible,
      remark: subPageForm.remark.trim(),
      status: subPageForm.status,
      routeConfig: buildRouteConfig(
        {
          path: subPageForm.path,
          name: subPageForm.routeName,
          component: subPageForm.component,
          redirect: '',
          keepAlive: true,
        },
        true,
        subPageOriginal.value,
      ),
    });
    MessagePlugin.success(t('pages.app.menu.subPageSaved'));
    subPageVisible.value = false;
    await load();
  } catch (error) {
    MessagePlugin.error((error as Error).message);
  } finally {
    savingSubPage.value = false;
  }
}

function openActionCreate() {
  if (!detailRow.value) return;
  Object.assign(actionForm, blankAction(detailRow.value.id));
  actionVisible.value = true;
}

function openActionEdit(action: MenuActionNode) {
  Object.assign(actionForm, {
    id: action.id,
    menuId: action.menuId,
    name: action.name ?? '',
    sort: action.sort ?? 0,
    remark: action.remark ?? '',
    status: action.status,
  });
  actionVisible.value = true;
}

async function submitAction() {
  const name = actionForm.name.trim();
  if (!name) {
    MessagePlugin.warning(t('pages.app.menu.actionNameRequired'));
    return;
  }

  savingAction.value = true;
  try {
    await saveAppMenuAction({
      clientAppId: clientAppId.value,
      id: actionForm.id,
      menuId: actionForm.menuId,
      name,
      sort: actionForm.sort ?? 0,
      remark: actionForm.remark.trim(),
      status: actionForm.status,
    });
    MessagePlugin.success(t('pages.app.menu.actionSaved'));
    actionVisible.value = false;
    await load();
  } catch (error) {
    MessagePlugin.error((error as Error).message);
  } finally {
    savingAction.value = false;
  }
}

function startDelete(kind: DeleteKind, id: string, name: string) {
  pendingDeleteKind.value = kind;
  pendingDeleteId.value = id;
  pendingDeleteName.value = name;
  deleteVisible.value = true;
}

function askDeleteMenu(row: AppMenuRow) {
  startDelete('menu', row.id, row.title);
}

function askDeleteSubPage(row: MenuSubPageNode) {
  startDelete('subPage', row.id, row.title);
}

function askDeleteAction(row: MenuActionNode) {
  startDelete('action', row.id, row.name);
}

async function confirmDelete() {
  const id = pendingDeleteId.value;
  if (!id) return;

  const kind = pendingDeleteKind.value;
  deleting.value = true;
  try {
    if (kind === 'subPage') {
      await deleteAppMenuSubPage({ clientAppId: clientAppId.value, id });
    } else if (kind === 'action') {
      await deleteAppMenuAction({ clientAppId: clientAppId.value, id });
    } else {
      await deleteAppMenu({ clientAppId: clientAppId.value, id });
    }
    MessagePlugin.success(
      kind === 'subPage'
        ? t('pages.app.menu.subPageDeleted')
        : kind === 'action'
          ? t('pages.app.menu.actionDeleted')
          : t('pages.app.menu.deleted'),
    );
    deleteVisible.value = false;
    await load();
  } catch (error) {
    MessagePlugin.error((error as Error).message);
  } finally {
    deleting.value = false;
  }
}

function back() {
  router.push({ name: 'app-list' });
}
</script>
<style lang="less" scoped>
.list-card-container {
  padding: var(--td-comp-paddingTB-xxl) var(--td-comp-paddingLR-xxl);

  :deep(.t-card__body) {
    padding: 0;
  }
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--td-comp-margin-xl);
  gap: 16px;
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.title {
  font-size: 16px;
  font-weight: 600;
}

.keyword {
  width: 220px;
}

.stack-alert {
  margin-bottom: var(--td-comp-margin-l);
}

.section {
  margin: 8px 0;
  font-weight: 600;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 0 12px;

  .section {
    margin: 0;
    font-size: 15px;
  }
}

.hint {
  margin: 0 0 12px;
  color: var(--t-color-text-secondary);
}

.pager {
  margin-top: 16px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
</style>
