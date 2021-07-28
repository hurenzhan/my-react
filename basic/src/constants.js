export const REACT_TEXT = Symbol('REACT_TEXT'); // react文本类型
export const REACT_ELEMENT = Symbol('react.element'); // react元素
export const REACT_FORWARD_REF = Symbol('react.forward_ref'); // 函数ref类型

// 片断
export const REACT_FRAGMENT = Symbol('react.fragment');

// diff type
export const PLACEMENT = 'PLACEMENT'; //插入元素
export const MOVE = 'MOVE'; // 位置的移动
export const DELETION = 'DELETION'; // 删除

// context
export const REACT_PROVIDER = Symbol('react.provider'); // 提供者
export const REACT_CONTEXT = Symbol('react.context'); // 接收者

export const REACT_MEMO = Symbol('react.memo'); // memo