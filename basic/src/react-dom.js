import {REACT_FORWARD_REF, REACT_TEXT} from "./constants";
import {addEvent} from "./event";

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
  if (type && type.$$typeof === REACT_FORWARD_REF) {//说明它是一个转发过的函数组件
    return mountForwardComponent(vdom);
  } else if (type === REACT_TEXT) {  // 文本类型就创建文本节点
    dom = document.createTextNode(props.content);
  } else if (typeof type === 'function') {// 函数类型，可能是类组件或函数组件
    if (type.isReactComponent) {//说明它是一个类组件
      return mountClassComponent(vdom);
    } else {
      return mountFunctionComponent(vdom);
    }
  } else {
    dom = document.createElement(type);// div span p
  }
  // 处理属性
  if (props) {
    updateProps(dom, {}, props); // 更新dom属性
    if (props.children) { // 有子集就挂载自己下面
      let children = props.children;
      if (typeof children === 'object' && children.type) { // 说明这是一个React元素
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

// 处理转发函数
function mountForwardComponent(vdom) {
  let {type, props, ref} = vdom;
  let renderVdom = type.render(props, ref);
  vdom.oldRenderVdom = renderVdom;
  return createDOM(renderVdom);
}

// 处理类组件
function mountClassComponent(vdom) {
  const { type: ClassComponent, props, ref } = vdom;
  const classInstance = new ClassComponent(props);
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
function mountFunctionComponent(vdom) {
  let {type, props} = vdom;
  let renderVdom = type(props); // 执行函数把props传入
  vdom.oldRenderVdom = renderVdom;  // 记录原dom
  return createDOM(renderVdom); // 函数组件返回的就是vdom，再生成真实dom
}

/**
 * 把新的属性更新到真实DOM上
 * @param {*} dom 真实DOM
 * @param {*} oldProps 旧的属性对象
 * @param {*} newProps 新的属性对象
 */
function updateProps(dom, oldProps, newProps) {
  for (const key in newProps) {
    if (newProps.hasOwnProperty(key)) {
      if (key === 'children') {
        // continue; // 此处忽略子节点的处理
        return;
      }
      if (key === 'style') { // 添加样式属性
        let styleObj = newProps[key];
        for (const attr in styleObj) {
          if (styleObj.hasOwnProperty(attr)) {
            dom.style[attr] = styleObj[attr];
          }
        }
        return;
      }
      if (key.startsWith('on')) {
        //dom[key.toLocaleLowerCase()] = newProps[key];
        addEvent(dom, key.toLocaleLowerCase(), newProps[key]);
      } else {
        dom[key] = newProps[key]; // className
      }
    }
  }
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

// 子节点更新
function updateChildren(parentDOM, oldVChildren, newVChildren) {
  oldVChildren = Array.isArray(oldVChildren) ? oldVChildren : oldVChildren ? [oldVChildren] : [];
  newVChildren = Array.isArray(newVChildren) ? newVChildren : newVChildren ? [newVChildren] : [];
  let maxChildrenLength = Math.max(oldVChildren.length, newVChildren.length); // 取最大值以完全比较
  for (let i = 0; i < maxChildrenLength; i++) {
    // 看当前节点的下一个有没有节点
    const nextVdom = oldVChildren.find((item, index) => index > i && item && findDOM(item));
    compareTwoVdom(parentDOM, oldVChildren[i], newVChildren[i], findDOM(nextVdom));
  }
}

// 类组件数据更新
function updateClassComponent(oldVdom, newVdom) {
  let classInstance = newVdom.classInstance = oldVdom.classInstance;
  classInstance?.componentWillReceiveProps?.(newVdom.props);  /* 生命周期-将要更新的数据 */
  classInstance.updater.emitUpdate(newVdom.props);  // 触发组件重新更新
  newVdom.oldRenderVdom = classInstance.oldRenderVdom; // 是用来找真实DOM时有用
}

// 函数组件数据更新
function updateFunctionComponent(oldVdom, newVdom) {
  const currentDOM = findDOM(oldVdom);
  const parentDOM = currentDOM.parentNode;
  const { type, props } = newVdom;
  const newRenderVdom = type(props);  // 执行新的函数获取newVdom
  compareTwoVdom(parentDOM, oldVdom.oldRenderVdom, newRenderVdom);  // 然后比较更新
  newVdom.oldRenderVdom = newRenderVdom;
}

// 节点类型相同处理方法
function updateElement(oldVdom, newVdom) {
  // 1.如果是文本节点，获取old把文本改为新的就行了
  if (oldVdom.type === REACT_TEXT) {
    if (oldVdom.props.content !== newVdom.props.content) {
      const currentDOM = newVdom.dom = findDOM(oldVdom);
      currentDOM.textContent = newVdom.props.content;//更新文本节点的内容为新的文本内容
    }
    // 2.此节点是下原生组件 span div而且 类型一样，说明可以复用老的dom节点
  } else if (typeof oldVdom.type === 'string') {
    const currentDOM = newVdom.dom = findDOM(oldVdom);  // 获取老的真实DOM，准备复用
    updateProps(currentDOM, oldVdom.props, newVdom.props);  // 直接用新的属性更新老的DOM节点即可
    updateChildren(currentDOM, oldVdom.props.children, newVdom.props.children); // 更新子节点
  } else if (typeof oldVdom.type === 'function') {
    if (oldVdom.type.isReactComponent) {  // 3.类组件
      console.log(oldVdom, newVdom, 'oldVdom, newVdom');
      updateClassComponent(oldVdom, newVdom);
    } else { // 4.函数组件
      updateFunctionComponent(oldVdom, newVdom);
    }
  }
}

/**
 * dom-diff核心是比较新旧虚拟DOM的差异，然后把差异同步到真实DOM节点上
 * @param {*} parentDOM
 * @param {*} oldVdom
 * @param {*} newVdom
 */
export function compareTwoVdom(parentDOM, oldVdom, newVdom, nextDOM) {
  if (!oldVdom && !newVdom) { // 1.老新都没有,什么都不需要做
    return null;
  } else if (oldVdom && !newVdom) { // 2.如果老的有，新的没有，卸载老节点
    unMountVdom(oldVdom);
  } else if (!oldVdom && newVdom) { // 3.如果老的没有，新有的
    let newDOM = createDOM(newVdom);  // 根据新的虚拟DOm创建新的真实DOM
    if (nextDOM) {  // 如果old下一个有元素，就把new插入old前，因为old位置可能不变，插入后面位置就会错乱
      parentDOM.insertBefore(newDOM, nextDOM)
    } else {
      parentDOM.appendChild(newDOM);//添加到父节点上
    }
    if (newDOM._componentDidMount) newDOM._componentDidMount();
    //如果老的有，新的也有，但是类型不同
  } else if (oldVdom && newVdom && oldVdom.type !== newVdom.type) { // 4.如果老的有，新的也有，但是类型不同
    unMountVdom(oldVdom); // 删除老的节点
    let newDOM = createDOM(newVdom);  // 根据新的虚拟DOm创建新的真实DOM
    if (nextDOM) {
      parentDOM.insertBefore(newDOM, nextDOM)
    } else {
      parentDOM.appendChild(newDOM);  // 添加到父节点上
    }
    if (newDOM._componentDidMount) newDOM._componentDidMount();
    //如果老的有，新的也有，并且类型也一样，只需要更新就可以，就可以复用老的节点了
  } else {
    // 如果老的有，新的也有，并且类型也一样，只需要更新就可以，就可以复用老的节点了，深度对比子节点的流程
    updateElement(oldVdom, newVdom);
  }
}

// 卸载vdom节点
function unMountVdom(vdom) {
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