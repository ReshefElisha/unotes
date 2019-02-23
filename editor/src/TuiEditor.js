import React, { Component } from 'react';
import Editor from 'tui-editor/dist/tui-editor-Editor-all';
import 'tui-editor/dist/tui-editor.css';
import 'tui-editor/dist/tui-editor-contents.css';
import 'codemirror/lib/codemirror.css';
import 'highlight.js/styles/github.css';
import './override.css';
import './override-contents.css';
import './override-codemirror.css';
import { debounce } from 'debounce';

var img_root = 'vscode-resource:/s:/BrainGrapes/Unotes/ext-test-project/2018 Notes/';

function escapeRegExp(str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

Editor.defineExtension('unotes', function() {
  const defaultRenderer = Editor.markdownit.renderer.rules.image;
  const httpRE = /^https?:\/\/|^data:/;
  Editor.markdownit.renderer.rules.image=function (tokens, idx, options, env, self) { 
    const token = tokens[idx]
    const srcIndex = token.attrIndex('src');
    const altIndex = token.attrIndex('alt');
    const ttlIndex = token.attrIndex('title');
    if(srcIndex<0 || httpRE.test(token.attrs[srcIndex][1])) {
      return defaultRenderer(tokens, idx, options, env, self);
    }
    const src = ' src="' + img_root + token.attrs[srcIndex][1] + '"';
    // check for empty alt but a content string
    let altstr = altIndex>=0 ? token.attrs[altIndex][1] : ''
    if(!altstr && token.content)
      altstr = token.content;   // replace with content
    const alt = ' alt="' + altstr + '"';
    const ttl = ' title="' + (ttlIndex>=0 ? token.attrs[ttlIndex][1] : '') + '"';
    const img = `<img${src}${alt}${ttl} />`;
    return img;
  };
});

class TuiEditor extends Component {

  constructor(props) {
    super(props);
    this.el = React.createRef();
  }

  componentDidMount() {
    
    let editor = new Editor({
      el: this.el.current,
      initialEditType: 'wysiwyg',
      previewStyle: 'vertical',
      height: window.innerHeight - 20,
      events: {
        change: debounce(this.onChange.bind(this), 400)
      },
      usageStatistics: false,
      useCommandShortcut: false,
      exts: ['scrollSync', 'colorSyntax', 'chart', 'uml', 'unotes']
    });

    editor.on("convertorBeforeHtmlToMarkdownConverted", this.onHtmlBefore.bind(this))

    window.addEventListener('message', this.handleMessage.bind(this));

    this.setState({ editor });
  }

  onHtmlBefore(e){
    return replaceAll(e, img_root, '');
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.handleMessage.bind(this));
  }

  handleMessage(e) {
    switch(e.data.command){
      case 'setContent':
        this.state.editor.setMarkdown(e.data.content);
        this.state.editor.scrollTop(0);
        break;
      case 'exec':
        this.state.editor.exec(...e.data.args);
        break;

      default:
    }
    
  }

  onChange = (event) => {
    window.vscode.postMessage({
      command: 'applyChanges',
      content: this.state.editor.getValue()
    });
  }

  render() {
    return (
      <div id="editor" ref={this.el} />
    );
  }
}

export default TuiEditor;
