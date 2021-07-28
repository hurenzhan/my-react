// 处理转发函数
import {createDOM} from "./react-dom";

export function mountForwardComponent(vdom) {
  let {type, props, ref} = vdom;
  let renderVdom = type.render(props, ref);
  vdom.oldRenderVdom = renderVdom;
  return createDOM(renderVdom);
}

// 处理类组件
export function mountClassComponent(vdom) {
  const {type: ClassComponent, props, ref} = vdom;
  const classInstance = new ClassComponent(props);
  if (ClassComponent.contextType) { // 添加 context
    classInstance.context = ClassComponent.contextType._currentValue;
  }
  // 如果类组件的虚拟DOM有ref属性，那么就把类的实例赋给ref.current属性
  if (ref) ref.current = classInstance;
  classInstance?.componentWillMount?.();  /* 生命周期-组件将要挂载 */
  // 把类组件的实例挂载到它对应的vdom上
  vdom.classInstance = classInstance;
  const renderVdom = classInstance.render();
  classInstance.oldRenderVdom = vdom.oldRenderVdom = renderVdom;
  //把类组件的实例的render方法返回的虚拟DOM转成真实DOM
  const dom = createDOM(renderVdom);
  if (classInstance.componentDidMount) { // 组件已经挂载
    // 添加生命周期属性，render方法最后挂载结束后调用
    dom._componentDidMount = classInstance.componentDidMount.bind(classInstance);
  }

  return dom
}

// 处理函数组件
export function mountFunctionComponent(vdom) {
  let {type, props} = vdom;
  let renderVdom = type(props); // 执行函数把props传入
  vdom.oldRenderVdom = renderVdom;  // 记录原dom
  return createDOM(renderVdom); // 函数组件返回的就是vdom，再生成真实dom
}

// 处理memo函数组件
export function mountMemo(vdom) {
  // 正常渲染就好
  let {type, props} = vdom;
  let renderVdom = type.type(props);
  vdom.prevProps = props;
  vdom.oldRenderVdom = renderVdom;
  return createDOM(renderVdom);
}

/**
 * 渲染Provider组件
 * 1.真正要渲染的是它的儿子children
 * 2.把Provider组件自己收到的value属性赋值给context._currentValue
 */
// 提供者
export function mountProvider(vdom) {
  let {type, props, ref} = vdom;
  let context = type._context;
  context._currentValue = props.value;
  let renderVdom = props.children;
  vdom.oldRenderVdom = renderVdom;  // 这个操作就是让当前的虚拟DOM的oldRenderVdom指向要渲染的虚拟DOm
  return createDOM(renderVdom);
}

// 接收者
export function mountContext(vdom) {
  let {type, props, ref} = vdom;
  let context = type._context;
  let currentValue = context._currentValue;
  let renderVdom = props.children(currentValue);
  vdom.oldRenderVdom = renderVdom;
  return createDOM(renderVdom);
}