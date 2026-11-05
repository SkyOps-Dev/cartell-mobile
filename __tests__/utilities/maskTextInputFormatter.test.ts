// mask_text_input_formatter 2.9.0 as Add Hub's MAC field uses it (CapitalizationFormatter, then
// the lazy XX:XX:XX:XX:XX:XX mask over hex digits), driven the way the field drives it: one edit
// at a time, from the text before to the text after.

import {
  applyFormatters,
  CapitalizationFormatter,
  editFromTexts,
} from '../../src/services/textInputFormatters';
import {
  MaskAutoCompletionType,
  MaskTextInputFormatter,
} from '../../src/utilities/maskTextInputFormatter';

const macFormatters = () => [
  new CapitalizationFormatter(),
  new MaskTextInputFormatter({
    mask: 'XX:XX:XX:XX:XX:XX',
    filter: { X: /[0-9a-fA-F]/ },
    type: MaskAutoCompletionType.lazy,
  }),
];

/** A field: `edit(next)` is the user changing the text to `next`; `text` is what shows. */
function field(formatters = macFormatters(), text = '') {
  return {
    text,
    edit(next: string) {
      const { oldValue, newValue } = editFromTexts(this.text, next);
      this.text = applyFormatters(formatters, oldValue, newValue).text;
      return this.text;
    },
    type(chars: string) {
      for (const c of chars) {
        this.edit(this.text + c);
      }
      return this.text;
    },
  };
}

test('a separator appears once the digit after it is typed (lazy)', () => {
  const f = field();
  expect(f.edit('a')).toBe('A');
  expect(f.edit('AB')).toBe('AB');
  expect(f.edit('ABc')).toBe('AB:C');
  expect(f.type('def01')).toBe('AB:CD:EF:01');
});

test('a whole MAC typed in comes out upper-case and full; more is cut off', () => {
  const f = field();
  expect(f.type('fffffffd0006')).toBe('FF:FF:FF:FD:00:06');
  expect(f.type('7')).toBe('FF:FF:FF:FD:00:06');
});

test('characters that are not hex digits are dropped', () => {
  const f = field();
  expect(f.type('a')).toBe('A');
  expect(f.edit('AG')).toBe('A');
  expect(f.edit('A ')).toBe('A');
  expect(f.edit('A:')).toBe('A');
});

test('pasting, with or without separators', () => {
  expect(field().edit('aabbccddeeff')).toBe('AA:BB:CC:DD:EE:FF');
  expect(field().edit('aa:bb:cc:dd:ee:ff')).toBe('AA:BB:CC:DD:EE:FF');
  expect(field().edit('aa-bb-cc-dd-ee-ff')).toBe('AA:BB:CC:DD:EE:FF');
});

test('Backspace after a separator removes the digit and the separator with it', () => {
  const f = field();
  f.type('abc');
  expect(f.text).toBe('AB:C');
  expect(f.edit('AB:')).toBe('AB');
  expect(f.edit('A')).toBe('A');
  expect(f.edit('')).toBe('');
});

test('text set in code bypasses the formatter, so the next edit starts from what it holds', () => {
  // A scanned MAC, then made editable: the formatter is a new one (Flutter makes it in the build
  // the new state causes) and has accepted nothing, so deleting one character clears the field
  // and typing one leaves only that character.
  const deleting = field(macFormatters(), 'FF:FF:FF:FD:00:06');
  expect(deleting.edit('FF:FF:FF:FD:00:0')).toBe('');
  const typing = field(macFormatters(), 'FF:FF:FF:FD:00:06');
  expect(typing.edit('FF:FF:FF:FD:00:06a')).toBe('A');
});

test('editFromTexts reads the change as Flutter sees it for typing at the cursor', () => {
  expect(editFromTexts('AB', 'AXB')).toEqual({
    oldValue: { text: 'AB', selection: { start: 1, end: 1 } },
    newValue: { text: 'AXB', selection: { start: 2, end: 2 } },
  });
  expect(editFromTexts('ABC', 'AC').oldValue.selection).toEqual({
    start: 1,
    end: 2,
  });
});

test('CapitalizationFormatter upper-cases and keeps the selection', () => {
  expect(
    new CapitalizationFormatter().formatEditUpdate(
      { text: '', selection: { start: 0, end: 0 } },
      { text: 'ab:c', selection: { start: 3, end: 3 } },
    ),
  ).toEqual({ text: 'AB:C', selection: { start: 3, end: 3 } });
});
