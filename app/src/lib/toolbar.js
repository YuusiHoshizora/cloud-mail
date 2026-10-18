/* 编辑器工具栏定义 + 命令执行（全屏写信页用） */

export const ICONS = {
  undo: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 5H3V2"/><path d="M3.4 5.6a5.4 5.4 0 1 1-.9 3"/></svg>',
  redo: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M10 5h3V2"/><path d="M12.6 5.6a5.4 5.4 0 1 0 .9 3"/></svg>',
  alignLeft: '<svg viewBox="0 0 16 16" width="14" height="14" stroke="currentColor" stroke-width="1.3"><path d="M2 4h12M2 8h8M2 12h12"/></svg>',
  alignCenter: '<svg viewBox="0 0 16 16" width="14" height="14" stroke="currentColor" stroke-width="1.3"><path d="M2 4h12M4 8h8M2 12h12"/></svg>',
  alignRight: '<svg viewBox="0 0 16 16" width="14" height="14" stroke="currentColor" stroke-width="1.3"><path d="M2 4h12M6 8h8M2 12h12"/></svg>',
  link: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6.5 9.5a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-1 1"/><path d="M9.5 6.5a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l1-1"/></svg>',
  image: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="3" width="12" height="10" rx="1"/><circle cx="5.4" cy="6.4" r="1"/><path d="M2.6 11.4L6 8l3 3 2-2 2.4 2.4"/></svg>',
  attach: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M10 4.6l-4 4a2 2 0 0 0 2.8 2.8l4-4a3 3 0 0 0-4.2-4.2L5 6.8"/></svg>',
  table: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="3" width="12" height="10"/><path d="M2 6.6h12M6 3v10M10 3v10"/></svg>',
  smiley: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6"/><path d="M5.6 9.4a3 3 0 0 0 4.8 0"/><circle cx="6.1" cy="6.4" r=".8" fill="currentColor" stroke="none"/><circle cx="9.9" cy="6.4" r=".8" fill="currentColor" stroke="none"/></svg>'
}

export const TOOL_GROUPS = [
  [
    { cmd: 'undo', icon: 'undo', title: '撤销' },
    { cmd: 'redo', icon: 'redo', title: '重做' }
  ],
  [
    { cmd: 'formatBlock', arg: 'p', label: '正文', title: '正文' },
    { cmd: 'formatBlock', arg: 'h2', label: 'H2', title: '标题' },
    { cmd: 'formatBlock', arg: 'h3', label: 'H3', title: '小标题' },
    { cmd: 'formatBlock', arg: 'blockquote', label: '❝', title: '引用' },
    { cmd: 'formatBlock', arg: 'pre', label: '</>', title: '代码块' }
  ],
  [
    { cmd: 'bold', label: 'B', cls: 'tool-btn--bold', title: '加粗' },
    { cmd: 'italic', label: 'I', cls: 'tool-btn--italic', title: '斜体' },
    { cmd: 'underline', label: 'U', cls: 'tool-btn--under', title: '下划线' },
    { cmd: 'strikeThrough', label: 'S', cls: 'tool-btn--strike', title: '删除线' }
  ],
  [
    { cmd: 'foreColor', arg: '#FFD700', swatch: '#FFD700', title: '金色文字' },
    { cmd: 'foreColor', arg: '#FFFFFF', swatch: '#FFFFFF', title: '白色文字' },
    { cmd: 'foreColor', arg: '#ff6b6b', swatch: '#ff6b6b', title: '红色文字' }
  ],
  [
    { cmd: 'justifyLeft', icon: 'alignLeft', title: '左对齐' },
    { cmd: 'justifyCenter', icon: 'alignCenter', title: '居中' },
    { cmd: 'justifyRight', icon: 'alignRight', title: '右对齐' }
  ],
  [
    { cmd: 'insertUnorderedList', label: '•', title: '无序列表' },
    { cmd: 'insertOrderedList', label: '1.', title: '有序列表' }
  ],
  [
    { cmd: 'link', icon: 'link', title: '链接' },
    { cmd: 'image', icon: 'image', title: '图片' },
    { cmd: 'attach', icon: 'attach', title: '附件' },
    { cmd: 'table', icon: 'table', title: '表格' },
    { cmd: 'hr', label: '—', title: '分割线' },
    { cmd: 'smiley', icon: 'smiley', title: '表情' },
    { cmd: 'clear', label: 'Tx', title: '清除格式' }
  ]
]

const TABLE_HTML =
  '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
  + '<tr><td style="border:1px solid rgba(255,255,255,.14);padding:8px">列一</td>'
  + '<td style="border:1px solid rgba(255,255,255,.14);padding:8px">列二</td></tr>'
  + '<tr><td style="border:1px solid rgba(255,255,255,.14);padding:8px">&nbsp;</td>'
  + '<td style="border:1px solid rgba(255,255,255,.14);padding:8px">&nbsp;</td></tr></table>'

/**
 * 执行一条格式命令。返回一条提示文案（没有就返回 null）。
 * 注意：image 需要真实上传接口，这里只提示。
 */
export function applyCommand(cmd, arg, el) {
  if (!el) return null
  el.focus()

  switch (cmd) {
    case 'link': {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) document.execCommand('insertHTML', false, '<a href="#">链接文字</a>')
      else document.execCommand('createLink', false, '#')
      return null
    }
    case 'image':
      return '图片需要真实上传接口（P1 接 /api 上传后启用）'
    case 'attach':
      return 'ATTACH'
    case 'table':
      document.execCommand('insertHTML', false, TABLE_HTML)
      return null
    case 'smiley':
      document.execCommand('insertText', false, '☺')
      return null
    case 'hr':
      document.execCommand('insertHorizontalRule')
      return null
    case 'clear':
      document.execCommand('removeFormat')
      document.execCommand('formatBlock', false, '<p>')
      return null
    case 'formatBlock':
      document.execCommand('formatBlock', false, `<${arg}>`)
      return null
    case 'foreColor':
      document.execCommand('styleWithCSS', false, true)
      document.execCommand('foreColor', false, arg)
      return null
    default:
      document.execCommand(cmd, false, arg ?? null)
      return null
  }
}
