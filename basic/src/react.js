import {wrapToVdom} from './utils';

/**
 * createElement('h1',null,'a','b');
 * 创建一个虚拟DOM，也就是一个React元素
 * @param {*} type  元素的类型span div p
 * @param {*} config 配置对象 className style
 * @param {*} children  儿子，有可能独生子(对象)，也可能是多个(数组)
 */
function createElement(type, config, children) {
  let ref;//可以通过 ref引用此元素
  let key;//可以唯一标识一个子元素
  if (config) {
    delete config.__source;
    delete config.__self;
    ref = config.ref;
    key = config.key;
    delete config.ref;
    delete config.key;
  }
  const props = {...config};  /*1.属性赋值*/
  // 参数大于 3 说明有多个子元素，转处理（如果是普通文本，转成react文本对象）
  if (arguments.length > 3) {
    props.children = Array.prototype.slice.call(arguments, 2).map(wrapToVdom);
  } else {
    props.children = wrapToVdom(children);//children可能是React元素对象，也可能是一个字符串 数字 null undefined
  }
  return {type, ref, key, props}
}

const React = {
  createElement
}
export default React;