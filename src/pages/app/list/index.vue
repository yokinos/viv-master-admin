<template>
  <div class="app-page">
    <section class="panel">
      <div class="panel__query">
        <t-input
          v-model="query.keyword"
          class="query-input"
          :placeholder="t('pages.app.list.keyword')"
          clearable
          @enter="search"
          @clear="search"
        >
          <template #prefix-icon>
            <search-icon />
          </template>
        </t-input>
        <t-button theme="primary" @click="search">{{ t('pages.app.list.search') }}</t-button>
        <t-button theme="default" variant="outline" @click="reset">{{ t('pages.app.list.reset') }}</t-button>
        <t-button class="query-create" theme="primary" variant="outline" @click="openCreate">
          <template #icon>
            <add-icon />
          </template>
          {{ t('pages.app.list.create') }}
        </t-button>
      </div>

      <t-loading :loading="loading" size="small">
        <div v-if="!rows.length" class="panel__empty">
          <t-empty :description="t('pages.app.list.empty')" />
        </div>
        <div v-else class="app-grid">
          <article
            v-for="row in rows"
            :key="row.id"
            class="app-card"
            :class="{ 'is-off': row.status !== AppStatus.Enabled }"
            @click="openMenus(row)"
          >
            <div class="app-card__head">
              <span class="app-avatar" :style="avatarStyle(row)">{{ initials(row.name) }}</span>
              <div class="app-card__ident">
                <h3 class="app-card__name" :title="row.name">{{ row.name || '—' }}</h3>
                <p class="app-card__sub">
                  <span>{{ enumLabel('platform', row.platform) }}</span>
                  <em>·</em>
                  <span>{{ enumLabel('stack', row.clientStack) }}</span>
                </p>
              </div>
              <span class="app-card__more" @click.stop>
                <t-dropdown trigger="click" :options="actionsOf(row)">
                  <t-button theme="default" variant="text" shape="square" :aria-label="t('pages.app.list.more')">
                    <more-icon />
                  </t-button>
                </t-dropdown>
              </span>
            </div>

            <button
              type="button"
              class="app-key"
              :title="t('pages.app.list.copyKey')"
              :disabled="!row.appKey"
              @click.stop="copyKey(row.appKey)"
            >
              <span class="app-key__label">APPKEY</span>
              <span class="app-key__value">{{ row.appKey || '—' }}</span>
              <copy-icon class="app-key__copy" />
            </button>

            <p v-if="row.remark" class="app-card__remark" :title="row.remark">{{ row.remark }}</p>

            <div class="app-card__foot">
              <span class="chip">{{ enumLabel('source', row.source) }}</span>
              <span v-if="target(row)" class="chip chip--mono" :title="target(row)">{{ target(row) }}</span>
              <span class="app-card__status" :class="row.status === AppStatus.Enabled ? 'is-on' : 'is-off'">
                <i />
                {{ row.status === AppStatus.Enabled ? t('pages.app.list.enabled') : t('pages.app.list.disabled') }}
              </span>
            </div>
          </article>
        </div>
      </t-loading>

      <div v-if="pagination.total > 0" class="panel__footer">
        <t-pagination
          v-model="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-size-options="[12, 24, 48]"
          @change="onPage"
        />
      </div>
    </section>

    <t-drawer
      v-model:visible="drawerVisible"
      :header="form.id === '0' ? t('pages.app.list.create') : t('pages.app.list.edit')"
      size="480px"
      :close-on-overlay-click="false"
      :confirm-btn="{ loading: saving, content: t('pages.app.menu.save') }"
      :cancel-btn="t('pages.app.menu.cancel')"
      @confirm="submit"
    >
      <t-form label-align="top">
        <t-form-item :label="t('pages.app.list.name')" required-mark>
          <t-input v-model="form.name" :maxlength="100" />
        </t-form-item>
        <t-form-item :label="t('pages.app.list.appKey')" required-mark>
          <t-input v-model="form.appKey" :maxlength="64" />
        </t-form-item>
        <t-form-item :label="t('pages.app.list.platform')">
          <t-select v-model="form.platform" :options="platformOptions" />
        </t-form-item>
        <t-form-item :label="t('pages.app.list.stack')">
          <t-select v-model="form.clientStack" :options="stackOptions" />
        </t-form-item>
        <t-form-item :label="t('pages.app.list.source')">
          <t-select v-model="form.source" :options="sourceOptions" />
        </t-form-item>
        <t-form-item :label="t('pages.app.list.status')">
          <t-radio-group v-model="form.status">
            <t-radio :value="AppStatus.Enabled">{{ t('pages.app.list.enabled') }}</t-radio>
            <t-radio :value="AppStatus.Disabled">{{ t('pages.app.list.disabled') }}</t-radio>
          </t-radio-group>
        </t-form-item>
        <t-form-item :label="t('pages.app.list.packageName')">
          <t-input v-model="form.packageName" :maxlength="100" />
        </t-form-item>
        <t-form-item :label="t('pages.app.list.bundleId')">
          <t-input v-model="form.bundleId" :maxlength="100" />
        </t-form-item>
        <t-form-item :label="t('pages.app.list.remark')">
          <t-textarea v-model="form.remark" :maxlength="500" />
        </t-form-item>
      </t-form>
    </t-drawer>

    <t-dialog
      v-model:visible="secretVisible"
      :header="t('pages.app.list.secretTitle')"
      :confirm-btn="t('pages.app.list.copySecret')"
      :cancel-btn="t('pages.app.menu.cancel')"
      @confirm="copySecret"
    >
      <p>{{ t('pages.app.list.secretBody') }}</p>
      <t-input v-model="createdSecret" readonly />
    </t-dialog>
  </div>
</template>
<script setup lang="ts">
import { AddIcon, CopyIcon, MoreIcon, SearchIcon } from 'tdesign-icons-vue-next';
import type { DropdownOption } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { pageApps, saveApp } from '@/api/apex/app';
import type { ClientAppListItem } from '@/api/model/apex/appModel';
import { AppStatus } from '@/api/model/apex/appModel';
import { t } from '@/locales';

import { enumLabel, platformValues, sourceValues, stackValues } from './labels';

defineOptions({
  name: 'AppList',
});

interface AppForm {
  id: string;
  name: string;
  appKey: string;
  platform: number;
  clientStack: number;
  source: number;
  status: number;
  packageName: string;
  bundleId: string;
  remark: string;
}

/**
 * 头像底色按 AppKey 哈希取，同一应用永远同一色。
 * 目的不是好看，是让一屏十几张卡各自有个可辨认的锚点 —— 光靠文字扫不出来。
 */
const AVATAR_COLORS: Array<[string, string]> = [
  ['#e8f1ff', '#1a5fd0'],
  ['#e2f4f8', '#0e7490'],
  ['#e2f6ef', '#0f766e'],
  ['#e9f5e4', '#3f6212'],
  ['#fdf2df', '#9a6700'],
  ['#fcede4', '#b45309'],
  ['#fdecec', '#b42318'],
  ['#f2ecfd', '#6d28d9'],
  ['#eaebfe', '#4338ca'],
  ['#fdebf3', '#be185d'],
];

const router = useRouter();
const query = reactive({ keyword: '' });
const appliedKeyword = ref('');
const loading = ref(false);
const saving = ref(false);
const rows = ref<ClientAppListItem[]>([]);
const pagination = ref({ current: 1, pageSize: 12, total: 0 });
const drawerVisible = ref(false);
const secretVisible = ref(false);
const createdSecret = ref('');
const form = reactive<AppForm>(blankForm());

const platformOptions = computed(() => platformValues.map((value) => ({ label: enumLabel('platform', value), value })));
const stackOptions = computed(() => stackValues.map((value) => ({ label: enumLabel('stack', value), value })));
const sourceOptions = computed(() => sourceValues.map((value) => ({ label: enumLabel('source', value), value })));

function blankForm(): AppForm {
  return {
    id: '0',
    name: '',
    appKey: '',
    platform: 0,
    clientStack: 0,
    source: 0,
    status: AppStatus.Enabled,
    packageName: '',
    bundleId: '',
    remark: '',
  };
}

function colorPair(row: ClientAppListItem) {
  const seed = row.appKey || row.name || row.id;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function avatarStyle(row: ClientAppListItem) {
  const [background, color] = colorPair(row);
  return { background, color };
}

/** 中文取前两个字，西文取首字母缩写。取不到就留一个占位符，不要空方块 */
function initials(name?: string) {
  const text = (name ?? '').trim();
  if (!text) return '?';
  if (/[\u4e00-\u9fa5]/.test(text)) return text.slice(0, 2);
  return text
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/** 包名 / BundleId 二者取其一：卡面只够放一个，另一个在编辑抽屉里 */
function target(row: ClientAppListItem) {
  return row.packageName || row.bundleId || '';
}

function actionsOf(row: ClientAppListItem): DropdownOption[] {
  return [
    { content: t('pages.app.list.menus'), value: 'menus', onClick: () => openMenus(row) },
    { content: t('pages.app.list.edit'), value: 'edit', onClick: () => openEdit(row) },
  ];
}

async function load() {
  loading.value = true;
  try {
    const page = await pageApps({
      pageIndex: pagination.value.current,
      pageSize: pagination.value.pageSize,
      keyword: appliedKeyword.value || undefined,
    });
    rows.value = page.items ?? [];
    pagination.value.total = Number(page.totalCount) || 0;
  } catch (error) {
    MessagePlugin.error((error as Error).message);
  } finally {
    loading.value = false;
  }
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

function reset() {
  query.keyword = '';
  search();
}

function openMenus(row: ClientAppListItem) {
  router.push({ name: 'app-list-menu', query: { clientAppId: row.id } });
}

function openCreate() {
  Object.assign(form, blankForm());
  drawerVisible.value = true;
}

function openEdit(row: ClientAppListItem) {
  Object.assign(form, {
    id: row.id,
    name: row.name ?? '',
    appKey: row.appKey ?? '',
    platform: row.platform,
    clientStack: row.clientStack,
    source: row.source,
    status: row.status,
    packageName: row.packageName ?? '',
    bundleId: row.bundleId ?? '',
    remark: row.remark ?? '',
  });
  drawerVisible.value = true;
}

async function submit() {
  if (!form.name.trim()) {
    MessagePlugin.warning(t('pages.app.list.nameRequired'));
    return;
  }
  if (!form.appKey.trim()) {
    MessagePlugin.warning(t('pages.app.list.appKeyRequired'));
    return;
  }

  saving.value = true;
  try {
    const saved = await saveApp({
      id: form.id,
      name: form.name.trim(),
      appKey: form.appKey.trim(),
      platform: form.platform,
      clientStack: form.clientStack,
      source: form.source,
      status: form.status,
      packageName: form.packageName.trim(),
      bundleId: form.bundleId.trim(),
      remark: form.remark.trim(),
    });
    drawerVisible.value = false;
    MessagePlugin.success(t('pages.app.list.saved'));
    if (saved.appSecret) {
      createdSecret.value = saved.appSecret;
      secretVisible.value = true;
    }
    await load();
  } catch (error) {
    MessagePlugin.error((error as Error).message);
  } finally {
    saving.value = false;
  }
}

async function copyKey(appKey: string) {
  if (!appKey) return;
  try {
    await navigator.clipboard.writeText(appKey);
    MessagePlugin.success(t('components.copySuccess'));
  } catch {
    MessagePlugin.error(t('components.copyFail'));
  }
}

async function copySecret() {
  try {
    await navigator.clipboard.writeText(createdSecret.value);
    MessagePlugin.success(t('components.copySuccess'));
    secretVisible.value = false;
  } catch {
    MessagePlugin.error(t('components.copyFail'));
  }
}

onMounted(load);
</script>
<style lang="less" scoped>
.app-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 查询 / 卡片 / 分页 共用一张白卡，靠分割线切开 */
.panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 10px;
}

.panel__query {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--td-border-level-1-color);
}

.query-input {
  width: 300px;
}

.query-create {
  margin-left: auto;
}

.panel__empty {
  padding: 56px 0;
}

.panel__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--td-border-level-1-color);
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(288px, 1fr));
  gap: 16px;
  padding: 20px;
}

/* 卡在白卡内，靠描边和极浅投影分层，不再靠底色反差 */
.app-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--td-brand-color-3);
    box-shadow: 0 12px 28px -18px rgb(0 0 0 / 45%);

    .app-card__more {
      opacity: 1;
    }

    .app-key__copy {
      opacity: 1;
    }

    .app-card__name {
      color: var(--td-brand-color);
    }
  }

  &.is-off {
    .app-avatar {
      filter: grayscale(1);
      opacity: 0.55;
    }

    .app-card__name {
      color: var(--td-text-color-placeholder);
    }
  }
}

.app-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-avatar {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
  user-select: none;
}

.app-card__ident {
  flex: 1;
  min-width: 0;
}

.app-card__name {
  margin: 0;
  overflow: hidden;
  color: var(--td-text-color-primary);
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  transition: color 0.15s ease;
  white-space: nowrap;
}

.app-card__sub {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0 0;
  overflow: hidden;
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  white-space: nowrap;

  em {
    font-style: normal;
    opacity: 0.6;
  }
}

.app-card__more {
  display: inline-flex;
  flex: none;
  margin-right: -6px;
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

/* AppKey 当"牌照"处理：等宽、可点复制，比一行 dt/dd 更好用 */
.app-key {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: var(--td-bg-color-secondarycontainer);
  color: var(--td-text-color-secondary);
  font-family: ui-monospace, SFMono-Regular, 'Cascadia Mono', Consolas, monospace;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--td-brand-color-1);
    color: var(--td-brand-color);
  }

  &:disabled {
    cursor: default;
  }
}

.app-key__label {
  flex: none;
  color: var(--td-text-color-placeholder);
  font-family: var(--td-font-family);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.app-key__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-key__copy {
  flex: none;
  font-size: 14px;
  opacity: 0.35;
  transition: opacity 0.15s ease;
}

.app-card__remark {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.app-card__foot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 12px;
  margin-top: auto;
  border-top: 1px solid var(--td-border-level-1-color);
}

.chip {
  display: inline-block;
  flex: none;
  padding: 1px 8px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--td-bg-color-secondarycontainer);
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip--mono {
  flex: 0 1 auto;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, 'Cascadia Mono', Consolas, monospace;
  font-size: 11px;
}

.app-card__status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 12px;
  white-space: nowrap;

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentcolor;
  }

  &.is-on {
    color: var(--td-success-color);
  }

  &.is-off {
    color: var(--td-text-color-placeholder);
  }
}
</style>
