// Copyright (c) Jeremy Tuloup
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';

import { CommandRegistry } from '@phosphor/commands';

import {
  DOMWidgetModel,
  ISerializers,
  WidgetModel,
  unpack_models,
  JupyterPhosphorWidget,
  DOMWidgetView
} from '@jupyter-widgets/base';

import { VBoxModel, VBoxView } from '@jupyter-widgets/controls';

import { MODULE_NAME, MODULE_VERSION } from './version';

import { SplitPanel } from '@phosphor/widgets';
import { Message } from '@phosphor/messaging';
import $ from 'jquery';

// Import the CSS
import '../css/widget.css';

export class PanelModel extends VBoxModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: PanelModel.model_name,
      _model_module: PanelModel.model_module,
      _model_module_version: PanelModel.model_module_version,
      _view_name: null
    };
  }

  static model_name = 'PanelModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
}

class JupyterPhosphorSplitPanelWidget extends SplitPanel {
  constructor(options: JupyterPhosphorWidget.IOptions & SplitPanel.IOptions) {
    let view = options.view;
    delete options.view;
    super(options);
    this.addClass('jp-JupyterPhosphorSplitPanelWidget');
    this._view = view;
  }

  processMessage(msg: Message) {
    super.processMessage(msg);
    this._view.processPhosphorMessage(msg);
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
    if (this._view) {
      this._view.remove();
    }
    this._view = null;
  }

  private _view: DOMWidgetView;
}

export class SplitPanelModel extends PanelModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: SplitPanelModel.model_name,
      _model_module: SplitPanelModel.model_module,
      _model_module_version: SplitPanelModel.model_module_version,
      _view_name: SplitPanelModel.model_name,
      _view_module: SplitPanelModel.model_module,
      _view_module_version: SplitPanelModel.model_module_version
    };
  }

  static model_name = 'SplitPanelModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'SplitPanelView';
  static view_module = MODULE_NAME;
  static view_module_name = MODULE_VERSION;
}

export class SplitPanelView extends VBoxView {
  _createElement(tagName: string) {
    this.pWidget = new JupyterPhosphorSplitPanelWidget({
      view: this,
      orientation: this.model.get('orientation')
    }) as any;
    return this.pWidget.node;
  }

  _setElement(el: HTMLElement) {
    if (this.el || el !== this.pWidget.node) {
      throw new Error('Cannot reset the DOM element.');
    }

    this.el = this.pWidget.node;
    this.$el = $(this.pWidget.node);
  }

  initialize(parameters: any) {
    super.initialize(parameters);
    const pWidget = (this.pWidget as any) as JupyterPhosphorSplitPanelWidget;
    this.model.on('change:orientation', () => {
      const orientation = this.model.get('orientation');
      pWidget.orientation = orientation;
    });
  }

  async render() {
    super.render();
    const views = await Promise.all(this.children_views.views);
    views.forEach(async (view: DOMWidgetView) => {
      this.pWidget.addWidget(view.pWidget);
    });
  }
}

export class ShellModel extends WidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: ShellModel.model_name,
      _model_module: ShellModel.model_module,
      _model_module_version: ShellModel.model_module_version
    };
  }

  initialize(attributes: any, options: any) {
    this.shell = ShellModel._shell;
    super.initialize(attributes, options);
    this.on('msg:custom', this.onMessage.bind(this));
  }

  private async onMessage(msg: any) {
    switch (msg.func) {
      case 'add':
        const { serializedWidget, area, args } = msg.payload;
        const model = await unpack_models(
          serializedWidget,
          this.widget_manager
        );
        const view = await this.widget_manager.create_view(model, {});

        let pWidget = view.pWidget;
        pWidget.id = view.id;
        pWidget.title.closable = true;
        pWidget.disposed.connect(() => {
          view.remove();
        });
        this.shell.add(pWidget, area, args);
        break;
      default:
        break;
    }
  }

  static serializers: ISerializers = {
    ...WidgetModel.serializers
  };

  static model_name = 'ShellModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name: string = null;
  static view_module: string = null;
  static view_module_version = MODULE_VERSION;

  private shell: JupyterFrontEnd.IShell;
  static _shell: JupyterFrontEnd.IShell;
}

export class CommandRegistryModel extends WidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: CommandRegistryModel.model_name,
      _model_module: CommandRegistryModel.model_module,
      _model_module_version: CommandRegistryModel.model_module_version
    };
  }

  initialize(attributes: any, options: any) {
    this.commands = CommandRegistryModel._commands;
    super.initialize(attributes, options);
    this.on('msg:custom', this.onMessage.bind(this));

    this.set('_commands', this.commands.listCommands());
    this.save_changes();
  }

  private onMessage(msg: any) {
    switch (msg.func) {
      case 'execute':
        const { command, args } = msg.payload;
        void this.commands.execute(command, args);
        break;
      default:
        break;
    }
  }

  static serializers: ISerializers = {
    ...WidgetModel.serializers
  };

  static model_name = 'CommandRegistryModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name: string = null;
  static view_module: string = null;
  static view_module_version = MODULE_VERSION;

  private commands: CommandRegistry;
  static _commands: CommandRegistry;
}

export class JupyterFrontEndModel extends WidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: JupyterFrontEndModel.model_name,
      _model_module: JupyterFrontEndModel.model_module,
      _model_module_version: JupyterFrontEndModel.model_module_version
    };
  }

  initialize(attributes: any, options: any) {
    this.app = JupyterFrontEndModel._app;
    super.initialize(attributes, options);
    this.send({ event: 'lab_ready' }, {});
    this.set('version', this.app.version);
    this.save_changes();
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers
  };

  static model_name = 'JupyterFrontEndModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name: string = null;
  static view_module: string = null;
  static view_module_version = MODULE_VERSION;

  private app: JupyterFrontEnd;
  static _app: JupyterFrontEnd;
}
