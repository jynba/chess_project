<template>
	<div id="app">
		<router-view />
	</div>
</template>

<script>
	export default {
		name: 'App',
	};
</script>

<style lang="scss">
	html,
	body {
		margin: 0;
		padding: 0;
		background: #c3ab89;
	}
	#app {
		@include bfc;
		position: relative;
		margin: 0 auto;
		min-height: 100%;
		background: url(./assets/bg.jpg) no-repeat;
		background-position-x: center;
		background-size: cover;
	}
</style>
