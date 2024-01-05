import ReactNamespace from 'react/index';
import ReactDomNamespace from 'react-dom';

const wnd: Window & typeof globalThis = eval("window");
const React = wnd.React as typeof ReactNamespace;
const ReactDOM = wnd.ReactDOM as typeof ReactDomNamespace;

export default React;
export {
  ReactDOM
}