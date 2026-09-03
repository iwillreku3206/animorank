import { DefaultTab, type GroupPanelPartInitParameters, type ITabRenderer } from 'dockview-core';

/**
 * Tab renderer for closable windows: composes dockview's default tab and
 * marks the element with `dv-closable-tab` so the theme shows its close
 * button (hidden by default for non-closable windows).
 */
export class WindowTab implements ITabRenderer {
  private readonly tab = new DefaultTab();

  constructor(closable: boolean) {
    this.tab.element.classList.add('dv-window-tab');
    this.tab.element.classList.toggle('dv-closable-tab', closable);
  }

  public get element(): HTMLElement {
    return this.tab.element;
  }

  public init(params: GroupPanelPartInitParameters): void {
    this.tab.init(params);
  }

  public dispose(): void {
    this.tab.dispose();
  }
}
