import { REACT_TEXT } from './constants';

// 把任意的元素包装成虚拟DOM对象
export function wrapToVdom(element) {
  return typeof element === 'string' || typeof element === 'number' ?
      { type: REACT_TEXT, props: { content: element } } : element;
}