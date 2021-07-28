import {addEvent} from "./event";
import {MOVE, PLACEMENT, REACT_CONTEXT, REACT_FRAGMENT, REACT_MEMO, REACT_PROVIDER, REACT_TEXT} from "./constants";
import {createDOM, findDOM, unMountVdom} from "./react-dom";

/**
 * 把新的属性更新到真实DOM上
 * @param {*} dom 真实DOM
 * @param {*} oldProps 旧的属性对象
 * @param {*} newProps 新的属性对象
 */
export function updateProps(dom, oldProps, newProps) {
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

// 子节点更新
export function updateChildren(parentDOM, oldVChildren, newVChildren) {
  oldVChildren = Array.isArray(oldVChildren) ? oldVChildren : oldVChildren ? [oldVChildren] : [];
  newVChildren = Array.isArray(newVChildren) ? newVChildren : newVChildren ? [newVChildren] : [];

  /*
  * 1 2 3 5
  * 5
  * 3 2 4 1
  * [2->1, 4->2, 1->3]
  * */

  const keyedOldMap = {}; // 老元素映射
  let lastPlacedIndex = 0; // 上一个不需要移动的老DOM节点的索引，小的移动，大的不动并更新索引
  oldVChildren.forEach((oldVChild, index) => {  /* 1.初始化老元素映射 */
    const oldKey = oldVChild.key || index;  // 如果提供了key,会使用key作为唯一标识，如果没有提供，会使用索引
    keyedOldMap[oldKey] = oldVChild;
  });

  const patch = []; // 操作队列 移动、删除、插入
  //循环新数组
  newVChildren.forEach((newVChild, index) => {  /* 2.找出需要操作的元素 */
    newVChild._mountIndex = index;  // 设置虚拟DOM的挂载索引为index
    let newKey = newVChild.key || index;
    let oldVChild = keyedOldMap[newKey];
    if (oldVChild) {
      //如果找到了，按理应该在此判断类型，省略....
      //先执行更新虚拟DOM元素 在React15里 DOM的更新和DOM-DIFF放在一起进行的。
      updateElement(oldVChild, newVChild);
      if (oldVChild._mountIndex < lastPlacedIndex) {  // 小的向后移动，大的不动
        patch.push({
          type: MOVE,
          oldVChild,
          newVChild,
          fromIndex: oldVChild._mountIndex,
          toIndex: index
        });
      }
      // 如果此节点被复用了，把它从map中删除
      delete keyedOldMap[newKey];
      lastPlacedIndex = Math.max(lastPlacedIndex, oldVChild._mountIndex);
    } else {  // 没有找到可复用老节点
      patch.push({
        type: PLACEMENT,
        newVChild,
        toIndex: index
      });
    }
  });

  // 需要移动的oldChild
  const moveChildList = patch.filter(action => action.type === MOVE).map(action => action.oldVChild);
  // 把剩下没有匹配和需要移动的dom先删除，DOM元素只要还被引用，就并不会被销毁，实际还在是内存里
  Object.values(keyedOldMap).concat(moveChildList).forEach(oldVChild => {
    let currentDOM = findDOM(oldVChild);
    currentDOM.parentNode.removeChild(currentDOM);
  });

  // 执行操作
  patch.forEach(action => {
    let {type, oldVChild, newVChild, fromIndex, toIndex} = action;
    let childNodes = parentDOM.childNodes;  // 获取真实的子DOM元素的集合[3]
    if (type === PLACEMENT) {
      let newDOM = createDOM(newVChild);  // 根据虚拟DOM创建真实DOM
      let childDOMNode = childNodes[toIndex]; // 找一下目标索引现在对应的真实DOM元素
      if (childDOMNode) { // 如果此位置 上已经 有DOM元素的，插入到它前面是
        parentDOM.insertBefore(newDOM, childDOMNode);
      } else {
        parentDOM.appendChild(newDOM);  // 添加到最后就可以了
      }
    } else if (type === MOVE) {
      let oldDOM = findDOM(oldVChild);  // 找到老的真实DOM 还可以把内存中的B取到，插入到指定的位置 B
      let childDOMNode = childNodes[toIndex]; // 找一下目标索引现在对应的真实DOM元素
      if (childDOMNode) { // 如果此位置 上已经 有DOM元素的，插入到它前面是
        parentDOM.insertBefore(oldDOM, childDOMNode);
      } else {
        parentDOM.appendChild(oldDOM);  // 添加到最后就可以了
      }
    }
  });
}

// 类组件数据更新
export function updateClassComponent(oldVdom, newVdom) {
  let classInstance = newVdom.classInstance = oldVdom.classInstance;
  classInstance?.componentWillReceiveProps?.(newVdom.props);  /* 生命周期-将要更新的数据 */
  classInstance.updater.emitUpdate(newVdom.props);  // 触发组件重新更新
  newVdom.oldRenderVdom = classInstance.oldRenderVdom; // 是用来找真实DOM时有用
}

// 函数组件数据更新
export function updateFunctionComponent(oldVdom, newVdom) {
  const currentDOM = findDOM(oldVdom);
  const parentDOM = currentDOM.parentNode;
  const {type, props} = newVdom;
  const newRenderVdom = type(props);  // 执行新的函数获取newVdom
  compareTwoVdom(parentDOM, oldVdom.oldRenderVdom, newRenderVdom);  // 然后比较更新
  newVdom.oldRenderVdom = newRenderVdom;
}

// 函数组件数据更新
export function updateMemo(oldVdom, newVdom) {
  let {type, prevProps} = oldVdom;  // 先拿原来的状态
  let renderVdom = oldVdom.oldRenderVdom;
  //比较结果是相等,就不需要重新渲染 render
  if (!type.compare(prevProps, newVdom.props)) {
    const currentDOM = findDOM(oldVdom);
    const parentDOM = currentDOM.parentNode;
    const {type, props} = newVdom;
    renderVdom = type.type(props);
    compareTwoVdom(parentDOM, oldVdom.oldRenderVdom, renderVdom);
  }
  newVdom.prevProps = newVdom.props;
  newVdom.oldRenderVdom = renderVdom;
}

// 节点类型相同处理方法
export function updateElement(oldVdom, newVdom) {
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
    if (oldVdom.type.isReactComponent) {            // 3.类组件
      updateClassComponent(oldVdom, newVdom);
    } else { // 4.函数组件
      updateFunctionComponent(oldVdom, newVdom);
    }
  } else if (oldVdom.type === REACT_FRAGMENT) {     // 4.片段
    const currentDOM = newVdom.dom = findDOM(oldVdom);  // 片段没有属性，更新子元素就好
    updateChildren(currentDOM, oldVdom.props.children, newVdom.props.children);
    //此节点是下原生组件 span div而且 类型一样，说明可以复用老的dom节点
  } else if (oldVdom.type.$$typeof === REACT_PROVIDER) {    // 5.context provider
    updateProvider(oldVdom, newVdom);
    //Consumer的更新
  } else if (oldVdom.type.$$typeof === REACT_CONTEXT) {      // 6.context consumer
    updateContext(oldVdom, newVdom);
  } else if (oldVdom.type.$$typeof === REACT_MEMO) {
    updateMemo(oldVdom, newVdom);
  }
}

/**
 * dom-diff核心是比较新旧虚拟DOM的差异，然后把差异同步到真实DOM节点上
 * @param {*} parentDOM
 * @param {*} oldVdom
 * @param {*} newVdom
 * @param {*} nextDOM
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
  } else {
    // 如果老的有，新的也有，并且类型也一样，只需要更新就可以，就可以复用老的节点了，深度对比子节点的流程
    updateElement(oldVdom, newVdom);
  }
}

// provider 更新属性
function updateProvider(oldVdom, newVdom) {
  let currentDOM = findDOM(oldVdom);  // <div style={{margin:'10px'
  let parentDOM = currentDOM.parentNode;  // div#root
  let {type, props} = newVdom;  // type ={$$typeof:REACT_PROVIDER,_context:context }
  let context = type._context;
  context._currentValue = props.value;  // 给context赋上新的_currentValue
  let renderVdom = props.children;
  compareTwoVdom(parentDOM, oldVdom.oldRenderVdom, renderVdom);
  newVdom.oldRenderVdom = renderVdom;
}

// consumer 更新
function updateContext(oldVdom, newVdom) {
  let currentDOM = findDOM(oldVdom);
  let parentDOM = currentDOM.parentNode;
  let {type, props} = newVdom;
  let context = type._context;
  let renderVdom = props.children(context._currentValue); // 用props来执行当前值
  compareTwoVdom(parentDOM, oldVdom.oldRenderVdom, renderVdom);
  newVdom.oldRenderVdom = renderVdom;
}
