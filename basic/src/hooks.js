import {compareTwoVdom} from "./handleUpdate";

// 每次render重新赋值，用来调度程序自上而下更新
let scheduleUpdate;

// 全局变量，记录hook的值
const hookState = [];

// 记录hook的索引值
let hookIndex = 0;

setTimeout(() => {
  console.log(hookState)
}, 2000)

// 初始化hook，更新调度的根节点和索引
export const initHook = function (parentDOM, vdom) {
  scheduleUpdate = () => {    // 在React里不管在哪里触发的更新，真正的调度都是从根节点开始的
    hookIndex = 0;//把索引重置为0
    compareTwoVdom(parentDOM, vdom, vdom); // 从根节点执行完整的dom-diff 进行组件的更新
  }
};

/* 状态处理中心 */
export function useReducer(reducer, initialState) {
  hookState[hookIndex] = hookState[hookIndex] || initialState;  // 因为每次更新都会重新执行一遍，如果有值就用之前存的，否则用传入的
  const currentIndex = hookIndex; // 闭包存一个索引，确保更新的时候索引不被覆盖

  function dispatch(action) {
    action = typeof action === 'function' ? action(hookState[currentIndex]) : action; // 如果不是函数直接赋值
    // 如果传了reducer，以它返回的值做为更新数据
    hookState[currentIndex] = reducer ? reducer(hookState[currentIndex], action) : action;
    scheduleUpdate(); // 状态变化后，要执行调度更新任务
  }

  return [hookState[hookIndex++], dispatch];
}

// 普通状态
export function useState(initialState) {
  return useReducer(null, initialState);
}

/**
 * 缓存对象处理
 * @param {*} factory 可以用来创建对象的工厂方法，必须有返回值
 * @param {*} deps 依赖数组
 * @description 因为hook组件每次渲染的值都是重新赋值开新地址，所以memo无法自动做优化，需要用一个方法来缓存值
 */
export function useMemo(factory, deps) {
  const currentInfo = hookState[hookIndex];
  if (currentInfo) { // 先判断是不是初次渲染
    const [lastMemo, lastDeps] = currentInfo; // 获取上次的 返回值 和 依赖变量
    // 比较两次依赖是不是相等
    const same = deps && deps.every((item, index) => item === lastDeps[index]);
    if (same) { // 一遍不变，直接返回上次的值
      hookIndex++;
      return lastMemo;
    } else {  // 否则重新执行函数
      const newMemo = factory();
      hookState[hookIndex++] = [newMemo, deps];
      return newMemo;
    }
  } else {
    //说明是初次渲染
    let newMemo = factory();
    hookState[hookIndex++] = [newMemo, deps];
    return newMemo;
  }
}

/**
 * 可以缓存回调函数
 * @param {*} callback 回调函数
 * @param {*} deps 依赖数组
 * @description 思路跟useMemo基本一样
 */
export function useCallback(callback, deps) {
  const currentInfo = hookState[hookIndex];
  if (currentInfo) {
    const [lastCallback, lastDeps] = currentInfo;
    const same = deps && deps.every((item, index) => item === lastDeps[index]);
    if (same) {
      hookIndex++;
      return lastCallback;
    } else {
      hookState[hookIndex++] = [callback, deps];
      return callback;
    }
  } else {
    hookState[hookIndex++] = [callback, deps];
    return callback;
  }
}

// 缓存自执行函数
export function useEffect(effect, deps) {
  const currentInfo = hookState[hookIndex];
  if (Array.isArray(currentInfo)) {  // 判断初次渲染
    const [lastDestroy, lastDeps] = currentInfo;
    const same = deps && deps.every((item, index) => item === lastDeps[index]);
    if (same) {
      hookIndex++;
    } else {
      lastDestroy?.();  // 如果有任何一个值不一样，则执行上一个销毁函数
      setTimeout(() => {
        const destroy = effect();
        hookState[hookIndex++] = [destroy, deps]
      });
    }
  } else {
    // 执行前都开启一个宏任务，让dom先加载完
    setTimeout(() => {
      const destroy = effect();
      hookState[hookIndex++] = [destroy, deps]
    });
  }
}

// 都不加载前自执行函数
export function useLayoutEffect(effect, deps) {
  //先判断是不是初次渲染
  if (hookState[hookIndex]) {
    let [lastDestroy, lastDeps] = hookState[hookIndex];
    let same = deps && deps.every((item, index) => item === lastDeps[index]);
    if (same) {
      hookIndex++;
    } else {
      //如果有任何一个值不一样，则执行上一个销毁函数
      lastDestroy && lastDestroy();
      queueMicrotask(() => {
        let destroy = effect();
        hookState[hookIndex++] = [destroy, deps]
      });
    }
  } else {
    //如果是第一次执行执行到此
    queueMicrotask(() => {
      let destroy = effect();
      hookState[hookIndex++] = [destroy, deps]
    });
  }
}