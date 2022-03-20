/**
 *
 * @param {*} actionCreator  function add(){return {type:ADD};}
 * @param {*} dispatch store.dispatch
 */
function bindActionCreator(actionCreator, dispatch) {
  return function (...args) { // 做个闭包等用户传参派发
    return dispatch(actionCreator.apply(this, args));
  }
}

/**
 *
 * @param {*} actionCreators action的创建者 此处可以只传一个创建者，也就是一个函数，也可以传一个对象
 * @param {*} dispatch
 */
function bindActionCreators(actionCreators, dispatch) {
  if (typeof actionCreators === 'function') { // 函数直接注册
    return bindActionCreator(actionCreators, dispatch)
  }
  const boundActionCreators = {}; // 用对象存起来，然后赋值派发方法
  for (const key in actionCreators) {
    const actionCreator = actionCreators[key];
    boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
  }
  return boundActionCreators;
}

export default bindActionCreators;