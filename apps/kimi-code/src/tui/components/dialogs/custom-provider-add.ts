import {
  Container,
  Input,
  Key,
  matchesKey,
  truncateToWidth,
  visibleWidth,
  type Focusable,
} from '@lcode-cli/pi-tui';

import { currentTheme } from '#/tui/theme';

export interface CustomProviderAddValue {
  readonly name: string;
  readonly baseUrl: string;
  readonly apiKey: string;
}

export type CustomProviderAddResult =
  | { readonly kind: 'ok'; readonly value: CustomProviderAddValue }
  | { readonly kind: 'cancel' };

const TITLE = 'Add custom provider';
const SUBTITLE_DEFAULT = 'Enter a name, base URL, and API key. Models are discovered from {base URL}/models.';
const SUBTITLE_NAME_EMPTY = 'Provider name cannot be empty.';
const SUBTITLE_URL_EMPTY = 'Base URL cannot be empty.';
const SUBTITLE_TOKEN_EMPTY = 'API key cannot be empty.';
const FOOTER_NOT_LAST = 'Tab / ↑↓ to switch  ·  Enter for next field  ·  Esc to cancel';
const FOOTER_LAST = 'Tab / ↑↓ to switch  ·  Enter to submit  ·  Esc to cancel';

type FieldId = 'name' | 'url' | 'token';

function maskInputLine(raw: string): string {
  const prefix = '> ';
  if (!raw.startsWith(prefix)) return raw;

  let end = raw.length;
  while (end > prefix.length && raw[end - 1] === ' ') {
    end--;
  }
  const padding = raw.slice(end);
  const content = raw.slice(prefix.length, end);

  const parts = content.split(/(\u001B(?:\[[0-9;]*m|_pi:c\u0007))/);
  const maskedContent = parts
    .map((part, index) => {
      if (index % 2 === 1) return part;
      return part.replaceAll(/[^ ]/g, '•');
    })
    .join('');

  return prefix + maskedContent + padding;
}

export class CustomProviderAddDialogComponent extends Container implements Focusable {
  focused = false;

  private readonly nameInput = new Input();
  private readonly urlInput = new Input();
  private readonly tokenInput = new Input();
  private readonly onDone: (result: CustomProviderAddResult) => void;
  private activeField: FieldId = 'name';
  private done = false;
  private hint: 'none' | 'name-empty' | 'url-empty' | 'token-empty' = 'none';

  constructor(onDone: (result: CustomProviderAddResult) => void) {
    super();
    this.onDone = onDone;
    this.nameInput.onSubmit = () => {
      this.focusField('url');
    };
    this.urlInput.onSubmit = () => {
      this.focusField('token');
    };
    this.tokenInput.onSubmit = () => {
      this.handleSubmit();
    };
  }

  handleInput(data: string): void {
    if (this.done) return;
    if (
      matchesKey(data, Key.escape) ||
      matchesKey(data, Key.ctrl('c')) ||
      matchesKey(data, Key.ctrl('d'))
    ) {
      this.cancel();
      return;
    }

    if (matchesKey(data, Key.tab) || matchesKey(data, Key.shift('tab'))) {
      this.toggleField();
      return;
    }
    if (matchesKey(data, Key.down)) {
      this.nextField();
      return;
    }
    if (matchesKey(data, Key.up)) {
      this.prevField();
      return;
    }

    if (this.hint !== 'none') {
      this.hint = 'none';
    }

    if (this.activeField === 'name') {
      this.nameInput.handleInput(data);
    } else if (this.activeField === 'url') {
      this.urlInput.handleInput(data);
    } else {
      this.tokenInput.handleInput(data);
    }
  }

  override invalidate(): void {
    super.invalidate();
    this.nameInput.invalidate();
    this.urlInput.invalidate();
    this.tokenInput.invalidate();
  }

  override render(width: number): string[] {
    const dialogActive = this.focused && !this.done;
    this.nameInput.focused = dialogActive && this.activeField === 'name';
    this.urlInput.focused = dialogActive && this.activeField === 'url';
    this.tokenInput.focused = dialogActive && this.activeField === 'token';

    const safeWidth = Math.max(0, width);
    if (safeWidth <= 0) return [''];
    const innerWidth = Math.max(1, safeWidth - 4);
    const pad = '  ';

    const border = (s: string): string => currentTheme.fg('primary', s);
    const titleStyled = currentTheme.boldFg('textStrong', TITLE);
    const subtitleText =
      this.hint === 'name-empty'
        ? SUBTITLE_NAME_EMPTY
        : this.hint === 'url-empty'
          ? SUBTITLE_URL_EMPTY
          : this.hint === 'token-empty'
            ? SUBTITLE_TOKEN_EMPTY
            : SUBTITLE_DEFAULT;
    const subtitleStyled = currentTheme.fg('textDim', subtitleText);
    const footerStyled = currentTheme.fg(
      'textDim',
      this.activeField === 'token' ? FOOTER_LAST : FOOTER_NOT_LAST,
    );

    const nameLabelText = 'Provider name';
    const urlLabelText = 'Base URL';
    const tokenLabelText = 'API key';
    const labelFor = (field: FieldId, text: string): string => {
      const active = this.activeField === field;
      return active
        ? currentTheme.boldFg('accent', text)
        : currentTheme.fg('textDim', text);
    };

    const titleLine = truncateToWidth(titleStyled, innerWidth, '…');
    const subtitleLine = truncateToWidth(subtitleStyled, innerWidth, '…');
    const footerLine = truncateToWidth(footerStyled, innerWidth, '…');
    const nameLabelLine = truncateToWidth(labelFor('name', nameLabelText), innerWidth, '…');
    const urlLabelLine = truncateToWidth(labelFor('url', urlLabelText), innerWidth, '…');
    const tokenLabelLine = truncateToWidth(labelFor('token', tokenLabelText), innerWidth, '…');
    const nameInputLine = this.nameInput.render(innerWidth)[0] ?? '> ';
    const urlInputLine = this.urlInput.render(innerWidth)[0] ?? '> ';
    const rawTokenInputLine = this.tokenInput.render(innerWidth)[0] ?? '> ';
    const tokenInputLine = maskInputLine(rawTokenInputLine);

    const contentLines: string[] = [
      titleLine,
      '',
      subtitleLine,
      '',
      nameLabelLine,
      nameInputLine,
      '',
      urlLabelLine,
      urlInputLine,
      '',
      tokenLabelLine,
      tokenInputLine,
      '',
      footerLine,
    ];

    if (safeWidth < 4) {
      return ['', ...contentLines.map((line) => truncateToWidth(line, safeWidth, '…'))];
    }

    const lines: string[] = [
      '',
      border('╭' + '─'.repeat(safeWidth - 2) + '╮'),
      border('│') + ' '.repeat(safeWidth - 2) + border('│'),
    ];

    for (const content of contentLines) {
      const vis = visibleWidth(content);
      const rightPad = Math.max(0, innerWidth - vis);
      lines.push(border('│') + pad + content + ' '.repeat(rightPad) + border('│'));
    }

    lines.push(border('│') + ' '.repeat(safeWidth - 2) + border('│'));
    lines.push(border('╰' + '─'.repeat(safeWidth - 2) + '╯'));
    lines.push('');

    return lines.map((line) => truncateToWidth(line, safeWidth, '…'));
  }

  private toggleField(): void {
    if (this.activeField === 'name') {
      this.focusField('url');
    } else if (this.activeField === 'url') {
      this.focusField('token');
    } else {
      this.focusField('name');
    }
  }

  private nextField(): void {
    if (this.activeField === 'name') {
      this.focusField('url');
    } else if (this.activeField === 'url') {
      this.focusField('token');
    }
  }

  private prevField(): void {
    if (this.activeField === 'token') {
      this.focusField('url');
    } else if (this.activeField === 'url') {
      this.focusField('name');
    }
  }

  private focusField(field: FieldId): void {
    this.hint = 'none';
    this.activeField = field;
  }

  private handleSubmit(): void {
    if (this.done) return;

    const nameValue = this.nameInput.getValue().trim();
    const urlValue = this.urlInput.getValue().trim();
    const tokenValue = this.tokenInput.getValue().trim();

    if (nameValue.length === 0) {
      this.hint = 'name-empty';
      this.activeField = 'name';
      return;
    }
    if (urlValue.length === 0) {
      this.hint = 'url-empty';
      this.activeField = 'url';
      return;
    }
    if (tokenValue.length === 0) {
      this.hint = 'token-empty';
      this.activeField = 'token';
      return;
    }

    this.done = true;
    this.onDone({ kind: 'ok', value: { name: nameValue, baseUrl: urlValue, apiKey: tokenValue } });
  }

  private cancel(): void {
    if (this.done) return;
    this.done = true;
    this.onDone({ kind: 'cancel' });
  }
}
