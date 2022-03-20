/**
 * 创建仓库
 * @param {*} reducer 处理器
 * @param {*} preloadedState 默认状态 或者 说初始状态
 */
function createStore(reducer, preloadedState) {
  let state = preloadedState;
  let listeners = []; // 订阅的组件，数据发生变化，执行里面的组件重新渲染

  function getState() {
    return state;
  }

  function dispatch(action) {
    state = reducer(state, action); // 根据老状态和action动作，计算新状态
    listeners.forEach(l => l());  // 更新订阅组件
  }

  function subscribe(listener) {
    listeners.push(listener); // 添加订阅组件
    return () => {  // subscribe会返回一个取消订阅的函数
      listeners = listeners.filter(l => l !== listener);
    }
  }

  dispatch({type: '@@REDXU/INIT'}); // 随便加一个状态让仓库初始化
  return {
    getState, // 用来获取当前的仓库中的状态
    dispatch, // 向仓库派发动作
    subscribe,  // 用来订阅仓库中的状态的变化
  }
}

export default createStore;