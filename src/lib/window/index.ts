import { mount, unmount, type Component } from 'svelte';
import { type GroupPanelPartInitParameters, type IContentRenderer } from 'dockview-core';

export interface WindowInitOptions<T> {
  title: string;
  closable: boolean;
  context: T;
}

export abstract class Window<T> {
  public id = crypto.randomUUID();
  private _element: HTMLDivElement;
  private rendererElement: HTMLDivElement;
  private componentInstance: ReturnType<typeof mount>;

  public title: string;
  public closable: boolean;

  constructor(
    protected options: WindowInitOptions<T>,
    component: Component<{ context: T }>
  ) {
    this._element = document.createElement('div');
    this._element.style.width = '100%';
    this._element.style.height = '100%';

    this.rendererElement = document.createElement('div');
    this.rendererElement.style.width = '100%';
    this.rendererElement.style.height = '100%';

    this.componentInstance = mount(component, {
      target: this._element,
      props: { context: options.context }
    });

    this.title = options.title;
    this.closable = options.closable;
  }

  public getRenderer(): IContentRenderer {
    const { rendererElement, _element } = this;
    return {
      element: this.rendererElement,
      init() {
        if (rendererElement.childElementCount === 0) {
          rendererElement.appendChild(_element);
        }
      },
      dispose() {
        while (rendererElement.firstChild) {
          rendererElement.removeChild(rendererElement.firstChild);
        }
      }
    };
  }

  public destroy() {
    unmount(this.componentInstance);
    this._element.remove();
  }
}
