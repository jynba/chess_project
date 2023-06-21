import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
	{
		path: '/',
		meta: {
			title: '中国象棋',
		},
		component: () => import('@/views/main.vue'),
	},
];

const router = createRouter({
	history: createWebHashHistory(),
	routes: routes,
});

export default router;
