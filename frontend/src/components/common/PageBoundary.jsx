import { Component } from "react";
import AsyncState from "./AsyncState.jsx";
export default class PageBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <AsyncState error title="หน้านี้ยังเปิดไม่ได้" onRetry={() => window.location.reload()} /> : this.props.children; }
}
