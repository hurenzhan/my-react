// 合并reduce
function combineReducers(reducers) {
  /**
   * state 老的总状态
   * action 动作
   */
  return function (state = {}, action) {
    const nextState = {};
    for (const key in reducers) {
      // 一次 初始化（@@REDXU/INIT）， state[key]是undefined，会取子reduce的默认值
      // 然后给createStore里的 state赋值 { reduce1, reduce2 }
      nextState[key] = reducers[key](state[key], action);
    }
    return nextState;
  }
}

export default combineReducers;