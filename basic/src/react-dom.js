import {
  MOVE,
  PLACEMENT,
  REACT_CONTEXT,
  REACT_FORWARD_REF,
  REACT_FRAGMENT, REACT_MEMO,
  REACT_PROVIDER,
  REACT_TEXT
} from "./constants";
import {
  mountClassComponent,
  mountContext,
  mountForwardComponent,
  mountFunctionComponent, mountMemo,
  mountProvider
} from "./handleComponent";
import {updateProps} from "./handleUpdate";

/**
 * 把虚拟DOM变成真实DOM插入到容器内部
 * @param {*} vdom 虚拟DOM
 * @param {*} container 容器
 */
function render(vdom, container) {
  mount(vdom, container);
}

// 挂载
function mount(vdom, parentDOM) {
  let newDOM = createDOM(vdom); /*1.vdom转化成真实dom*/
  if (newDOM) {
    parentDOM.appendChild(newDOM);
    if (newDOM._componentDidMount) newDOM._componentDidMount(); /* 生命周期-dom挂载完后 */
  }
}

// 把虚拟DOM转成真实DOM
export function createDOM(vdom) {
  if (!vdom) return null;
  let {type, props, ref} = vdom;
  let dom;// 1.真实DOM
  if (type && type.$$typeof === REACT_FORWARD_REF) {  // 说明它是一个转发过的函数组件
    return mountForwardComponent(vdom);
  } else if (type === REACT_TEXT) {  // 文本类型就创建文本节点
    dom = document.createTextNode(props.content);
  } else if (typeof type === 'function') {// 函数类型，可能是类组件或函数组件
    if (type.isReactComponent) {  // 说明它是一个类组件
      return mountClassComponent(vdom);
    } else {
      return mountFunctionComponent(vdom);
    }
  } else if (type === REACT_FRAGMENT) { // 代码片段
    dom = document.createDocumentFragment();
  } else if (type && type.$$typeof === REACT_PROVIDER) {
    return mountProvider(vdom);
  } else if (type && type.$$typeof === REACT_CONTEXT) {
    return mountContext(vdom);
  } else if (type && type.$$typeof === REACT_MEMO) {
    return mountMemo(vdom);
  } else {
    dom = document.createElement(type);// div span p
  }
  // 处理属性
  if (props) {
    updateProps(dom, {}, props); // 更新dom属性
    if (props.children) { // 有子集就挂载自己下面
      let children = props.children;
      if (typeof children === 'object' && children.type) { // 说明这是一个React元素
        children._mountIndex = 0; // diff中做下标用
        mount(children, dom);
      }
      if (Array.isArray(children)) {  // 集合就循环挂载
        reconcileChildren(props.children, dom);
      }
    }
  }
  vdom.dom = dom; // 让虚拟DOM的dom属性指向这个虚拟DOM对应的真实DOM
  if (ref) ref.current = dom; // 如果把虚拟DOM转成真实DOM，就让ref.current = 真实DOM
  return dom;
}

// 循环挂载多个子元素
function reconcileChildren(childrenVdom, parentDOM) {
  childrenVdom.forEach(childVdom => mount(childVdom, parentDOM));
}

// 查找组件的真实dom
export function findDOM(vdom) {
  if (!vdom) return null;
  if (vdom.dom) { // vdom = {type:'h1'}
    return vdom.dom;
  } else {
    //类组件 还是函数组件，他们虚拟DOM身上没有dom属性，但是oldRenderVdom
    return findDOM(vdom.oldRenderVdom);
  }
}

// 卸载vdom节点
export function unMountVdom(vdom) {
  let {props, ref} = vdom;
  let currentDOM = findDOM(vdom); // 获取此虚拟DOM对应的真实DOM
  // vdom可能是原生组件span 类组件 classComponent 也可能是函数组件Function
  vdom?.classInstance?.componentWillUnmount?.();  /* 生命周期-即将卸载 */
  if (ref) ref.current = null;
  //取消监听函数
  Object.keys(props).forEach(propName => {
    // 卸载事件集
    if (propName.slice(0, 2) === 'on') {
      if (currentDOM?._store) delete currentDOM._store;
    }
  });
  //如果此虚拟DOM有子节点的话，递归全部删除
  if (props.children) {
    //得到儿子的数组
    let children = Array.isArray(props.children) ? props.children : [props.children];
    children.forEach(unMountVdom);
  }
  //把自己这个虚拟DOM对应的真实DOM从界面删除
  if (currentDOM) currentDOM.parentNode.removeChild(currentDOM);
}

const ReactDOM = {
  render
}
export default ReactDOM;