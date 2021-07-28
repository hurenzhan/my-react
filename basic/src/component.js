import {findDOM} from './react-dom';
import {compareTwoVdom} from "./handleUpdate";

//更新队列
export let updateQueue = {
  isBatchingUpdate: false, // 默认值是非批量的，同步的
  updaters: [],//更新器的数组
  batchUpdate() {
    for (let updater of updateQueue.updaters) {
      updater.updateComponent();  // 更新updater类添加的队列
    }
    updateQueue.updaters.length = 0;
    updateQueue.isBatchingUpdate = false;
  }
}

class Updater {
  constructor(classInstance) {
    this.classInstance = classInstance;
    this.pendingStates = [];  // 等待生效的数组
    //this.callbacks = [];
  }

  // 设置组件状态
  addState(partialState) {
    this.pendingStates.push(partialState);
    this.emitUpdate();// 触发更新
  }

  // 触发更新
  emitUpdate(nextProps) { // nextProps：新的属性
    this.nextProps = nextProps;
    //  有可能是批量异步更新，也有可能是同步更新
    if (updateQueue.isBatchingUpdate) {
      // 如果是批量更新，先加入队列
      updateQueue.updaters.push(this); // 不刷新组件视图了，只是把自己这个updater实例添加到updateQueue等待生效
    } else {
      // 同步直接更新
      this.updateComponent();
    }
  }

  updateComponent() {
    const {classInstance, nextProps, pendingStates} = this;
    if (nextProps || pendingStates.length > 0) {  // 属性或者状态变了都会进入更新逻辑
      shouldUpdate(classInstance, nextProps, this.getState());
    }
  }

  // 合并参数
  getState() {
    const {classInstance, pendingStates} = this;
    let {state} = classInstance;//{number:0} 老状态
    pendingStates.forEach((partialState) => {//和每个分状态
      if (typeof partialState === 'function') {
        partialState = partialState(state);
      }
      state = {...state, ...partialState};
    });
    pendingStates.length = 0;//清空等待生效的状态 的数组
    return state;
  }
}

//
function shouldUpdate(classInstance, nextProps, nextState) {
  let willUpdate = true;//表示组件是否要更新

  /* 生命周期-根据数据变化控制组件更新 */
  if (classInstance.shouldComponentUpdate && !classInstance.shouldComponentUpdate(nextProps, nextState)) willUpdate = false;  // 用户返回false说不需要重新render

  /* 生命周期-将要更新组件 */
  willUpdate && classInstance?.componentWillUpdate?.(); // 如果要更新，并且有componentWillUpdate方法，就执行它

  //不管要不要更新组件，状态都要更新
  if (nextProps) classInstance.props = nextProps;

  classInstance.state = nextState; // 先把新状态赋值给实例的state
  if (willUpdate) classInstance.forceUpdate();  // render节点
}

class Component {
  static isReactComponent = true //当子类继承父类的时候 ，父类的静态属性也是可以继承的
  constructor(props) {
    this.props = props;
    this.state = {};
    this.updater = new Updater(this); // 更新类
  }

  // 添加修改队列
  setState(partialState) {
    this.updater.addState(partialState);
  }

  // 根据新的属性状态计算新的要渲染的虚拟DOM
  forceUpdate() {
    const oldRenderVdom = this.oldRenderVdom; // 上一次类组件 render 方法计算得到的虚拟DOM
    //const oldDOM = oldRenderVdom.dom;
    const oldDOM = findDOM(oldRenderVdom);  // 获取 oldRenderVdom 对应的真实DOM
    if (this.constructor.contextType) { // 添加context
      this.context = this.constructor.contextType._currentValue;
    }

    /* 生命周期-派生 */
    if (this.constructor.getDerivedStateFromProps) {  // 做state修改代理，派生状态
      let newState = this.constructor.getDerivedStateFromProps(this.props, this.state);
      if (newState)
        this.state = newState;
    }

    /* 生命周期-给update传参 */
    const snapshot = this?.getSnapshotBeforeUpdate?.()

    //然后基于新的属性和状态，计算新的虚拟DOM
    const newRenderVdom = this.render();  // 此时state更新了，拿到的就是使用新state的vdom
    compareTwoVdom(oldDOM.parentNode, oldRenderVdom, newRenderVdom);
    this.oldRenderVdom = newRenderVdom;
    this?.componentDidUpdate?.(this.props, this.state, snapshot); /* 生命周期-数据更新结束 */
  }
}

export default Component;