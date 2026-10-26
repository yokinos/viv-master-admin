<template>
  <t-dropdown trigger="click">
    <t-button theme="default" shape="square" variant="text">
      <translate-icon />
    </t-button>
    <t-dropdown-menu>
      <t-dropdown-item v-for="(lang, index) in languageList" :key="index" :value="lang.value" @click="onChange">{{
        lang.content
      }}</t-dropdown-item></t-dropdown-menu
    >
  </t-dropdown>
</template>
<script setup lang="ts">
import { TranslateIcon } from 'tdesign-icons-vue-next';

import { languageList } from '@/locales';
import { useLocale } from '@/locales/useLocale';

const { changeLocale } = useLocale();

// TDesign 的 dropdown click 载荷在不同版本里是 DropdownOption / string / number，
// 这里统一收敛，避免模板里直接取 .value 触发类型错误。
type DropdownPayload = string | number | { value?: string | number } | undefined;

function onChange(payload: DropdownPayload) {
  const value =
    payload !== null && typeof payload === 'object' ? payload.value : (payload as string | number | undefined);
  if (value === undefined || value === '') return;
  changeLocale(String(value));
}
</script>
