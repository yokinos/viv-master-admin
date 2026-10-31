<template>
  <div class="app-page">
    <t-card :bordered="false" class="panel">
      <t-form layout="inline" label-width="0" :data="query" @submit="search">
        <t-form-item name="keyword">
          <t-input
            v-model="query.keyword"
            class="keyword"
            :placeholder="t('pages.app.list.keyword')"
            clearable
            @enter="search"
            @clear="search"
          />
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button type="submit">{{ t('pages.app.list.search') }}</t-button>
            <t-button theme="default" variant="outline" @click="reset">{{ t('pages.app.list.reset') }}</t-button>
            <t-button @click="openCreate">{{ t('pages.app.list.create') }}</t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card :bordered="false" class="panel">
      <t-loading :loading="loading" size="small">
        <t-empty v-if="!rows.length" :description="t('pages.app.list.empty')" />
        <t-row v-else :gutter="[16, 16]">
          <t-col v-for="row in rows" :key="row.id" :xs="12" :sm="6" :lg="4" :xl="3">
            <t-card class="app-card" :bordered="true" hover-shadow>
              <template #header>
                <div class="app-card-head">
                  <div class="app-card-title">
                    <span class="name">{{ row.name || '—' }}</span>
                    <t-tag
                      :theme="row.status === AppStatus.Enabled ? 'success' : 'default'"
                      variant="light"
                      size="small"
                    >
                      {{
                        row.status === AppStatus.Enabled ? t('pages.app.list.enabled') : t('pages.app.list.disabled')
                      }}
                    </t-tag>
                  </div>
                  <t-dropdown trigger="click" :options="actionsOf(row)">
                    <t-button theme="default" variant="text" shape="square" :aria-label="t('pages.app.list.more')">
                      <more-icon />
                    </t-button>
                  </t-dropdown>
                </div>
              </template>
              <dl class="meta">
                <div>
                  <dt>{{ t('pages.app.list.appKey') }}</dt>
                  <dd>{{ row.appKey || '—' }}</dd>
                </div>
                <div>
                  <dt>{{ t('pages.app.list.platform') }}</dt>
                  <dd>{{ enumLabel('platform', row.platform) }}</dd>
                </div>
                <div>
                  <dt>{{ t('pages.app.list.stack') }}</dt>
                  <dd>{{ enumLabel('stack', row.clientStack) }}</dd>
                </div>
                <div>
                  <dt>{{ t('pages.app.list.source') }}</dt>
                  <dd>{{ enumLabel('source', row.source) }}</dd>
                </div>
                <div v-if="row.packageName">
                  <dt>{{ t('pages.app.list.packageName') }}</dt>
                  <dd>{{ row.packageName }}</dd>
                </div>
                <div v-if="row.bundleId">
                  <dt>{{ t('pages.app.list.bundleId') }}</dt>
                  <dd>{{ row.bundleId }}</dd>
                </div>
                <div v-if="row.remark">
                  <dt>{{ t('pages.app.list.remark') }}</dt>
                  <dd>{{ row.remark }}</dd>
                </div>
              </dl>
            </t-card>
          </t-col>
        </t-row>
      </t-loading>
      <t-pagination
        v-if="pagination.total > 0"
        v-model="pagination.current"
        v-model:page-size="pagination.pageSize"
        class="pager"
        :total="pagination.total"
        :page-size-options="[12, 24, 48]"
        @change="onPage"
      />
    </t-card>

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
import { MoreIcon } from 'tdesign-icons-vue-next';
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

.panel {
  :deep(.t-card__body) {
    padding: var(--td-comp-paddingTB-l) var(--td-comp-paddingLR-xl);
  }
}

.keyword {
  width: 280px;
}

.app-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.app-card-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.name {
  font-weight: 600;
}

.meta {
  margin: 0;

  > div {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }

  dt {
    color: var(--td-text-color-secondary);
  }

  dd {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.pager {
  margin-top: 16px;
}
</style>
