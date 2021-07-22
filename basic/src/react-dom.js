import {REACT_TEXT} from "./constants";
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
  }
}

// 把虚拟DOM转成真实DOM
export function createDOM(vdom) {
  if (!vdom) return null;
  let {type, props} = vdom;
  let dom;// 1.真实DOM
  if (type === REACT_TEXT) {  // 文本类型就创建文本节点
    dom = document.createTextNode(props.content);
  }
  if (typeof type === 'function') {// 函数类型，可能是类组件或函数组件
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
  return dom;
}

// 处理类组件
function mountClassComponent(vdom) {
  let {type: ClassComponent, props} = vdom;
  let classInstance = new ClassComponent(props);  // 生成实例传入props
  let renderVdom = classInstance.render();  // render函数返回的还是vdom
  classInstance.oldRenderVdom = vdom.oldRenderVdom = renderVdom;  // 给类和vdom添加原vdom属性
  return createDOM(renderVdom); // 生成真实dom
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
      }
      if (key === 'style') { // 添加样式属性
        let styleObj = newProps[key];
        for (const attr in styleObj) {
          if (styleObj.hasOwnProperty(attr)) {
            dom.style[attr] = styleObj[attr];
          }
        }
      }
      if (key.startsWith('on')) {
        //dom[key.toLocaleLowerCase()] = newProps[key];
        addEvent(dom, key.toLocaleLowerCase(), newProps[key]);
      } else {
        dom[key] = newProps[key];//className
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

/**
 * dom-diff核心是比较新旧虚拟DOM的差异，然后把差异同步到真实DOM节点上
 * @param {*} parentDOM
 * @param {*} oldVdom
 * @param {*} newVdom
 */
export function compareTwoVdom(parentDOM, oldVdom, newVdom) {
  let oldDOM = findDOM(oldVdom);
  // 根据新的虚拟DOM得到新的真实DOM
  let newDOM = createDOM(newVdom);
  // 把老的真实DOM替换为新的真实DOM replaceChild 原生的DOM操作
  parentDOM.replaceChild(newDOM, oldDOM);
}

const ReactDOM = {
  render
}
export default ReactDOM;