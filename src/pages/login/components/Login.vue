<template>
  <t-form class="item-container login-password" :data="formData" :rules="FORM_RULES" label-width="0" @submit="onSubmit">
    <!-- 后端按手机号匹配用户（LoginRequest.UserName 只是字段名），所以这里是手机号 -->
    <t-form-item name="userName">
      <t-input v-model="formData.userName" size="large" :placeholder="t('pages.login.input.phone')">
        <template #prefix-icon>
          <t-icon name="mobile" />
        </template>
      </t-input>
    </t-form-item>

    <t-form-item name="password">
      <t-input
        v-model="formData.password"
        size="large"
        :type="showPsw ? 'text' : 'password'"
        clearable
        :placeholder="t('pages.login.input.password')"
      >
        <template #prefix-icon>
          <t-icon name="lock-on" />
        </template>
        <template #suffix-icon>
          <t-icon :name="showPsw ? 'browse' : 'browse-off'" @click="showPsw = !showPsw" />
        </template>
      </t-input>
    </t-form-item>

    <t-form-item class="btn-container">
      <t-button block size="large" type="submit" :loading="loading">
        {{ t('pages.login.signIn') }}
      </t-button>
    </t-form-item>
  </t-form>
</template>
<script setup lang="ts">
import type { SubmitContext } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { t } from '@/locales';
import { useUserStore } from '@/store';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

// 开发期预填，方便直接点登录；上线前清空
const INITIAL_DATA = {
  userName: '18672902270',
  password: '123456',
};

const formData = ref({ ...INITIAL_DATA });
const showPsw = ref(false);
const loading = ref(false);

const FORM_RULES = computed(() => ({
  userName: [{ required: true, message: t('pages.login.required.phone'), type: 'error' as const }],
  password: [{ required: true, message: t('pages.login.required.password'), type: 'error' as const }],
}));

const onSubmit = async (ctx: SubmitContext) => {
  if (ctx.validateResult !== true) return;

  loading.value = true;
  try {
    await userStore.login({
      userName: formData.value.userName.trim(),
      password: formData.value.password,
    });

    MessagePlugin.success(t('pages.login.loginSuccess'));

    const redirect = route.query.redirect as string;
    router.push(redirect || '/dashboard');
  } catch (e) {
    MessagePlugin.error((e as Error).message);
  } finally {
    loading.value = false;
  }
};
</script>
<style lang="less" scoped>
@import '../index.less';
</style>
