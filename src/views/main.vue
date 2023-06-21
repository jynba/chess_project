<template>
	<transition name="fade">
		<i v-show="isChi" class="jy-icon jy-icon-chi"></i>
	</transition>
	<i v-show="isJiang" class="jy-icon jy-icon-jiang"></i>
	<i v-show="isJue" class="jy-icon jy-icon-jue"></i>
	<div class="jy-wrapper">
		<div style="width: 30%"></div>
		<div style="height: 500px">
			<div class="jy-playContext">
				<canvas ref="canvas" height="375" width="375" class="jy-canvas" />
			</div>
			<div class="jy-title">
				<el-button type="info">当前运棋方：{{ runSide }}</el-button>
				<el-button type="primary" @click="restart">重开</el-button>
				<el-button type="primary" @click="giveup">认输</el-button>
				<el-button type="primary" @click="regret">悔棋</el-button>
			</div>
		</div>
		<div class="jy-history">
			<el-scrollbar height="500px">
				<div style="text-align: center">
					<strong>=====历史着法=====</strong>
				</div>
				<div class="jy-hisContent">
					<div class="jy-hisRed">
						<div style="margin: 0.3rem 1rem" v-for="item in movelist[0]">
							<span class="jy-hisItem">{{ item }}</span>
						</div>
					</div>
					<div class="jy-hisBlack">
						<div style="margin: 0.3rem 1rem" v-for="item in movelist[1]">
							<span class="jy-hisItem">{{ item }}</span>
						</div>
					</div>
				</div>
			</el-scrollbar>
		</div>
	</div>
</template>
<script lang="ts" setup>
	import request from '../utils/request.js';
	import ZhChess, {
		CheckPoint,
		GameOverCallback,
		MoveCallback,
		MoveFailCallback,
		Point,
		peiceSideMap,
	} from 'zh-chess';

	import { onMounted, reactive, getCurrentInstance, ref } from 'vue';
	import { ElMessage } from 'element-plus';

	let isChi = ref(false);
	let isJiang = ref(false);
	let isJue = ref(false);

	const page = getCurrentInstance();
	const runSide = ref();
	let movelist = reactive([['红方'], ['黑方']] as any[]);
	const gameHistory_RED: string[] = [];

	let game = reactive({} as ZhChess);
	let ctx = {} as CanvasRenderingContext2D;
	// 获取当前棋局状态
	const getBoardState = () => {
		const arr = game.currentLivePieceList.map(({ x, y }) => '' + x + y);
		const blackPart = arr.slice(0, 16);
		const part1 = arr.slice(16, 21);
		const part2 = arr.slice(21, 23);
		const part3 = arr.slice(23);
		const redPart = [...part3, ...part2, ...part1];
		let res = [...redPart, ...blackPart];
		return res;
	};

	const onOver: GameOverCallback = (winnerSide) => {
		isJue.value = true;
		ElMessage({
			icon: 'success',
			message: `${winnerSide}胜`,
		});
		console.log(`${winnerSide}胜`);
	};

	let pre: string[];
	let cur: string[];
	let movestatus: string;
	const move: MoveCallback = async (pos, cp: CheckPoint, jiangjun, penCode) => {
		if (jiangjun && !game.gameOver()) {
			isJiang.value = true;
			setTimeout(() => {
				isJiang.value = false;
			}, 1300);
		}
		const run = penCode[penCode.length - 1];

		//run为b则说明红方走完到黑方；run为w则说明黑方走完到红方

		// console.log(pre, 'pre');
		// console.log(pos, 'pos');
		// console.log(cp, 'cp'); //cp.move和cp.eat

		// 判断移动或是吃子；获取移动前、移动后、移动状态
		if ('move' in cp) {
			movestatus = '' + pos.x + pos.y + cp.move.x + cp.move.y;
			cur = pre.map((item: string) => {
				if (item === '' + pos.x + pos.y) {
					return '' + cp.move.x + cp.move.y;
				} else {
					return item;
				}
			});
		} else {
			movestatus = '' + pos.x + pos.y + cp.eat.x + cp.eat.y;
			isChi.value = true;
			setTimeout(() => {
				isChi.value = false;
			}, 1300);
			cur = pre.map((item: string) => {
				if (item === '' + cp.eat.x + cp.eat.y) {
					return '99';
				} else if (item === '' + pos.x + pos.y) {
					return '' + cp.eat.x + cp.eat.y;
				} else {
					return item;
				}
			});
		}
		// console.log('pre:', pre);
		// console.log('movestatus', movestatus);
		// console.log('cur', cur);

		if (run == 'b') {
			//此时红方走完
			runSide.value = '黑方';

			//记录红方走棋
			movelist[0].push(movestatus);
			gameHistory_RED.push(penCode);

			//此时红方已经走完，到黑方走棋，需要借助接口
			const data1: any = await request({
				url: '/predictChessAction/' + cur.join(''),
				method: 'get',
			});
			console.log(data1);
			if (data1.possible_chess_moving.length) {
				const predictAction = data1.possible_chess_moving[0].predictAction;
				const arr = predictAction.split('');
				let p1 = new Point(Number(arr[0]), Number(arr[1])) as Point;
				let p2 = new Point(Number(arr[2]), Number(arr[3])) as Point;
				game.updateAsync(p1, p2, 'BLACK', true, () => game.draw(ctx));
				game.checkDraw();
			} else {
				const fen = game.getCurrentPenCode('BLACK'); //获取黑方走棋的fen格式棋局
				const data2: any = await request({
					url:
						'https://www.chessdb.cn/chessdb.php?action=querybest&board=' + fen,
					method: 'get',
				});
				//最后四位为棋子移动status
				let movestatus = data2.slice(-5);
				let p1 = new Point(
					Number(movestatus.charCodeAt(0) - 97),
					9 - Number(movestatus.charAt(1))
				) as Point;
				let p2 = new Point(
					Number(movestatus.charCodeAt(2) - 97),
					9 - Number(movestatus.charAt(3))
				) as Point;
				game.updateAsync(p1, p2, 'BLACK', true, () => game.draw(ctx));
				game.checkDraw();
				console.log(data2.length);
				if (data2.length > 10) {
					alert('没有该棋谱了！！！帮我走一下吧');
				}
			}
		}
		if (run == 'w') {
			//此时黑方走完
			runSide.value = '红方';

			// 记录黑方走棋
			movelist[1].push(movestatus); //记录历史着法
		}

		pre = cur; //更新棋局状态
	};

	// 棋子移动失败 回调
	const moveFail: MoveFailCallback = (pos, mov, msg) => {
		// console.log(pos, 'pos');
		// console.log(mov, 'mov');
		// console.log(msg, 'msg');
		if (msg == '不可以送将！') {
			alert(msg);
		}
	};

	const restart = () => {
		isJue.value = false;
		movelist[0].splice(1, movelist[0].length);
		movelist[1].splice(1, movelist[1].length);
		gameHistory_RED.splice(1, gameHistory_RED.length);
		runSide.value = '红方'; //初始运棋方：红方
		game.gameOver();
		game.gameStart('RED'); //红先
	};
	const giveup = () => {
		alert('你输了！');
		//清空历史着法
		movelist[0].splice(1, movelist[0].length);
		movelist[1].splice(1, movelist[1].length);
		gameHistory_RED.splice(1, gameHistory_RED.length);
		runSide.value = '红方'; //初始运棋方：红方
		game.gameOver();
		game.gameStart('RED');
	};
	const regret = () => {
		if (gameHistory_RED.length == 1) return;
		//设置棋局状态
		game.setPenCodeList(gameHistory_RED.slice(-2)[0]);
		gameHistory_RED.splice(-1, 1); //删除红方最后一个棋局状态
		game.checkDraw();
		runSide.value = '红方';
		pre = getBoardState(); //更新纯数字棋局状态
		//更新历史着法
		movelist[0].splice(-1, 1);
		movelist[1] = movelist[1].slice(0, movelist[0].length);
		game.changeCurrentPlaySide('RED');
		console.log(gameHistory_RED);
	};

	// 挂载
	onMounted(() => {
		const canvas = page?.refs.canvas as HTMLCanvasElement;
		const Height = 375;
		const Width = 375;
		ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
		game = new ZhChess({
			ctx,
			gameHeight: Height,
			gameWidth: Width,
		});
		game.gameStart('RED'); //红先
		canvas.addEventListener('click', game.listenClickAsync, false);
		pre = getBoardState(); //纯数字棋局状态
		gameHistory_RED.push(game.getCurrentPenCode('RED')); //初始棋局状态
		runSide.value = peiceSideMap[(game as any).currentSide]; //初始运棋方：红方

		game.on('over', onOver);
		game.on('move', move);
		game.on('moveFail', moveFail);
	});
</script>

<style scoped lang="scss">
	@include b(icon) {
		z-index: 9;
		position: absolute;
		top: 41%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: inline-block;
		width: 160px;
		height: 160px;
		background-image: url('../assets/game-bg.png');
	}
	@include b(icon-chi) {
		background-position: -332px -434px; /* 设置背景图片偏移量 */
		background-size: 508px 507px;
		width: 68px;
		height: 71px;
		transform: translate(-50%, -50%) rotate(-90deg);
	}
	@include b(icon-jiang) {
		background-position: -222px -197px; /* 设置背景图片偏移量 */
		background-size: 508px 507px;
		width: 120px;
		height: 86px;
	}
	@include b(icon-jue) {
		background-position: -221px -339px; /* 设置背景图片偏移量 */
		background-size: 508px 507px;
		width: 74px;
		height: 71px;
	}

	@include b(wrapper) {
		position: relative;
		width: 100%;
		height: 100vh;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		justify-content: space-between;
		align-items: center;
		@include b(playContext) {
			position: relative;
			display: flex;
			@include b(canvas) {
			}
		}
		@include b(title) {
			display: flex;
			justify-content: space-between;
			align-items: center;
			width: 375px;
			margin: 0.86667rem 0;
		}
		@include b(history) {
			height: 500px;
			width: 375px;
			display: flex;
			justify-content: flex-start;
			flex-direction: column;
			align-items: flex-start;
			margin-left: 0.8rem;
			@include b(hisTitle) {
				text-align: center;
				font-size: 0.42667rem;
				margin: 0.26667rem 0;
			}
			@include b(hisContent) {
				display: flex;
				width: 100%;
				justify-content: center;
				margin: 0.5rem 0 0 0;
				@include b(hisRed) {
					display: flex;
					flex-direction: column;
					@include b(hisItem) {
						margin: 0.5rem;
					}
				}
				@include b(hisBlack) {
					display: flex;
					flex-direction: column;
					@include b(hisItem) {
						margin: 0.5rem;
					}
				}
			}
		}
	}
	.fade-leave-active,
	.fade-enter-active {
		transition: opacity 1.5s ease-in-out;
	}

	.fade-enter,
	.fade-leave-to {
		opacity: 0;
	}
</style>
