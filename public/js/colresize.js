class ColumnResizer {
  constructor(tableEl, options = {}) {
    this.table = tableEl;
    this.minWidth = options.minWidth || 40;
    this.padding = options.padding || 14;
    this.storageKey = options.storageKey || 'cyberpdv_col_widths';
    this.thEls = [];
    this.colEls = [];
    this.handleEls = [];
    this.activeHandle = null;
    this._init();
  }

  _init() {
    const theadRow = this.table.querySelector('thead tr');
    if (!theadRow) return;
    this.thEls = [...theadRow.querySelectorAll('th')];
    if (this.thEls.length < 2) return;

    let colgroup = this.table.querySelector('colgroup');
    if (!colgroup) {
      colgroup = document.createElement('colgroup');
      this.table.insertBefore(colgroup, this.table.firstChild);
    }
    colgroup.innerHTML = '';
    this.colEls = this.thEls.map((th, i) => {
      const col = document.createElement('col');
      col.dataset.colIndex = i;
      colgroup.appendChild(col);
      return col;
    });

    this._applySavedWidths();
    this._buildHandles();
  }

  _buildHandles() {
    this.handleEls.forEach(h => h.remove());
    this.handleEls = [];

    for (let i = 0; i < this.thEls.length - 1; i++) {
      const th = this.thEls[i];
      const handle = document.createElement('div');
      handle.className = 'col-resize-handle';
      handle.dataset.colIndex = i;
      th.appendChild(handle);

      handle.addEventListener('mousedown', (e) => this._onMouseDown(e, i));
      handle.addEventListener('dblclick', (e) => this._onDblClick(e, i));
      this.handleEls.push(handle);
    }
  }

  _onMouseDown(e, colIndex) {
    e.preventDefault();
    e.stopPropagation();
    this.activeHandle = colIndex;
    const startX = e.clientX;
    const startW = this._getColWidth(colIndex);
    const handle = this.handleEls[colIndex];
    handle.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('col-resizing');

    const onMove = (ev) => {
      const diff = ev.clientX - startX;
      const newW = Math.max(this.minWidth, startW + diff);
      this._setColWidth(colIndex, newW);
    };

    const onUp = () => {
      handle.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.classList.remove('col-resizing');
      this._saveWidths();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  _onDblClick(e, colIndex) {
    e.preventDefault();
    e.stopPropagation();
    const maxW = this._measureColumn(colIndex);
    this._setColWidth(colIndex, maxW);
    this._saveWidths();
  }

  _getColWidth(index) {
    const w = this.colEls[index]?.style.width;
    return w ? parseFloat(w) : this.thEls[index].getBoundingClientRect().width;
  }

  _setColWidth(index, px) {
    const w = Math.round(px) + 'px';
    this.colEls[index].style.width = w;
    this.colEls[index].style.minWidth = w;
  }

  _measureColumn(colIndex) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '12px monospace, sans-serif';

    let maxW = 0;

    const cells = this.table.querySelectorAll('tbody tr');
    if (cells.length) {
      for (const row of cells) {
        const cell = row.cells[colIndex];
        if (!cell) continue;
        const text = cell.textContent.trim();
        const m = ctx.measureText(text || '');
        maxW = Math.max(maxW, m.width);
      }
    }

    const headerText = this.thEls[colIndex].textContent.trim();
    const headerW = ctx.measureText(headerText).width;
    maxW = Math.max(maxW, headerW);

    const isActions = this.thEls[colIndex]?.dataset.col === 'acoes';
    if (isActions) {
      return Math.max(110, maxW + this.padding + 20);
    }

    return Math.max(this.minWidth, maxW + this.padding);
  }

  _saveWidths() {
    const widths = {};
    this.colEls.forEach((col, i) => {
      const w = col.style.width;
      if (w) widths[i] = w;
    });
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(widths));
    } catch (_) {}
  }

  _applySavedWidths() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const widths = JSON.parse(raw);
      for (const [i, w] of Object.entries(widths)) {
        if (this.colEls[i]) {
          this.colEls[i].style.width = w;
          this.colEls[i].style.minWidth = w;
        }
      }
    } catch (_) {}
  }

  destroy() {
    this.handleEls.forEach(h => h.remove());
    this.handleEls = [];
  }
}
