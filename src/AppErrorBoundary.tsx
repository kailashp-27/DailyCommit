import { Component, type ReactNode } from 'react';
export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="app"><header className="topbar"><span className="brand">DailyCommit</span></header><div className="content"><section className="card empty-state"><h2>Could not open this screen</h2><p>Your saved habits remain on this device.</p><button className="primary" onClick={() => window.location.reload()}>Reopen app</button></section></div></main>;
    return this.props.children;
  }
}
