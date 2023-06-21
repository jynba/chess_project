import { defineConfig } from 'vite';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		AutoImport({
			resolvers: [ElementPlusResolver()],
		}),
		Components({
			resolvers: [ElementPlusResolver()],
		}),
	],
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
	// 服务器代理
	server: {
		proxy: {
			'/api': {
				target: 'http://106.55.180.180:2344', // 接口的域名
				secure: false, // 如果是https接口，需要配置这个参数
				changeOrigin: true, // 如果接口跨域，需要进行这个参数配置
				rewrite: (path) => path.replace(/^\/api/, ''),
			},
		},
	},
	// css预处理器
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@import "./src/bem.scss";`,
			},
		},
	},
});
