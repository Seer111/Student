// 错误边界（ErrorBoundary）：给整棵组件树加一层「兜底网」
//
// 为什么需要它：React 里只要有一个组件在渲染时抛错，React 就会卸载整棵组件树 ——
// 没有错误边界时用户看到的是一片白屏，既不知道出了什么事，也没法继续操作。
// 有了它，出错时只把这一块替换成错误面板：导航栏和其他功能都还在。
//
// 注意：只有类组件能当错误边界（靠 getDerivedStateFromError / componentDidCatch 这两个生命周期），
// 函数组件做不到，所以这里必须写成 class。
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, componentStack: null };
  }

  // 渲染阶段捕获子组件抛出的错误，返回值会合并进 state（这一步不能有副作用）
  static getDerivedStateFromError(error) {
    return { error };
  }

  // 提交阶段：把错误与组件栈打到控制台，方便定位是哪个页面/组件崩的
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] 界面渲染出错：', error, info && info.componentStack);
    this.setState({ componentStack: (info && info.componentStack) || null });
  }

  // 路由切换时自动复位：否则某个页面崩过之后，切到别的页面还会一直卡在错误面板上
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, componentStack: null });
    }
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="card error-panel">
        <h2 className="error-title">这个页面出错了</h2>
        <p className="error-message">{error && error.message ? error.message : String(error)}</p>
        <details className="error-details">
          <summary>查看技术细节（错误栈 / 组件栈）</summary>
          <pre>{String((error && error.stack) || error)}</pre>
          {componentStack ? <pre>{componentStack}</pre> : null}
        </details>
        <div className="error-actions">
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            重新加载页面
          </button>
          <a className="btn btn-plain" href="/">
            返回首页
          </a>
        </div>
        <p className="error-hint">
          其他功能不受影响：导航栏仍然可用；如果反复出现，把上面「技术细节」里的内容发给开发者即可。
        </p>
      </div>
    );
  }
}

export default ErrorBoundary;
