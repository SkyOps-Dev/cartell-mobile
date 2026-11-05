// Port of mask_text_input_formatter 2.9.0 (MaskTextInputFormatter, as Add Hub's MAC field uses
// it), line for line, so a user's edits come out the same: a mask such as "XX:XX:XX:XX:XX:XX"
// whose filter characters (X) accept only matching input, with the mask's other characters filled
// in around them.
//
// Lazy (the default): a separator is added once the character after it is typed, so typing "A",
// "B", "C" shows "A", "AB", "AB:C". Characters the filter refuses are dropped, and input past
// the mask's length is cut off.
//
// The formatter remembers the characters it has accepted (its unmasked text) between edits, and
// only an edit the user makes runs it. Text set in code bypasses it, so after the field's text is
// set in code the formatter still holds what it had; the next edit is worked out from that.

import type {
  TextEditingValue,
  TextInputFormatter,
} from '../services/textInputFormatters';

export enum MaskAutoCompletionType {
  lazy = 'lazy',
  eager = 'eager',
}

class TextMatcher {
  readonly symbolArray: string[] = [];

  get length(): number {
    return this.symbolArray.reduce((sum, match) => sum + match.length, 0);
  }

  removeRange(start: number, end: number): void {
    this.symbolArray.splice(start, end - start);
  }

  insert(start: number, substring: string): void {
    for (let i = 0; i < substring.length; i++) {
      this.symbolArray.splice(start + i, 0, substring[i]);
    }
  }

  removeAt(index: number): void {
    this.symbolArray.splice(index, 1);
  }

  at(index: number): string {
    return this.symbolArray[index];
  }

  clear(): void {
    this.symbolArray.length = 0;
  }

  toString(): string {
    return this.symbolArray.join('');
  }

  set(text: string): void {
    this.clear();
    for (let i = 0; i < text.length; i++) {
      this.symbolArray.push(text[i]);
    }
  }
}

const emptyValue: TextEditingValue = {
  text: '',
  selection: { start: 0, end: 0 },
};

export class MaskTextInputFormatter implements TextInputFormatter {
  private typeValue: MaskAutoCompletionType;
  private mask: string | undefined;
  private maskChars: string[] = [];
  private maskFilter: Record<string, RegExp> | undefined;
  private maskLength = 0;
  private readonly resultTextArray = new TextMatcher();
  private resultTextMasked = '';

  constructor({
    mask,
    filter,
    initialText,
    type = MaskAutoCompletionType.lazy,
  }: {
    mask?: string;
    filter?: Record<string, RegExp>;
    initialText?: string;
    type?: MaskAutoCompletionType;
  } = {}) {
    this.typeValue = type;
    this.updateMask({
      mask,
      filter: filter ?? { '#': /[0-9]/, A: /[^0-9]/ },
      newValue:
        initialText === undefined
          ? undefined
          : {
              text: initialText,
              selection: {
                start: initialText.length,
                end: initialText.length,
              },
            },
    });
  }

  get type(): MaskAutoCompletionType {
    return this.typeValue;
  }

  updateMask({
    mask,
    filter,
    type,
    newValue,
  }: {
    mask?: string;
    filter?: Record<string, RegExp>;
    type?: MaskAutoCompletionType;
    newValue?: TextEditingValue;
  }): TextEditingValue {
    this.mask = mask;
    if (filter !== undefined) {
      this.maskFilter = filter;
      this.maskChars = Object.keys(filter);
    }
    if (type !== undefined) {
      this.typeValue = type;
    }
    this.calcMaskLength();
    let targetValue = newValue;
    if (targetValue === undefined) {
      const unmaskedText = this.getUnmaskedText();
      targetValue = {
        text: unmaskedText,
        selection: { start: unmaskedText.length, end: unmaskedText.length },
      };
    }
    this.clear();
    return this.formatEditUpdate(emptyValue, targetValue);
  }

  getMaskedText(): string {
    return this.resultTextMasked;
  }

  getUnmaskedText(): string {
    return this.resultTextArray.toString();
  }

  isFill(): boolean {
    return this.resultTextArray.length === this.maskLength;
  }

  clear(): void {
    this.resultTextMasked = '';
    this.resultTextArray.clear();
  }

  formatEditUpdate(
    oldValue: TextEditingValue,
    newValue: TextEditingValue,
  ): TextEditingValue {
    const mask = this.mask;

    if (mask === undefined || mask.length === 0) {
      this.resultTextMasked = newValue.text;
      this.resultTextArray.set(newValue.text);
      return newValue;
    }

    if (oldValue.text.length === 0) {
      this.resultTextArray.clear();
    }

    const beforeText = oldValue.text;
    const afterText = newValue.text;

    const beforeSelection = oldValue.selection;

    // Every selection here is valid (Flutter checks isValid; a TextField's always is).
    let beforeSelectionStart = beforeSelection.start;

    for (
      let i = 0;
      i < beforeSelectionStart && i < beforeText.length && i < afterText.length;
      i++
    ) {
      if (beforeText[i] !== afterText[i]) {
        beforeSelectionStart = i;
        break;
      }
    }

    const beforeSelectionLength = beforeSelection.end - beforeSelectionStart;

    const lengthDifference =
      afterText.length - (beforeText.length - beforeSelectionLength);
    const lengthRemoved = lengthDifference < 0 ? Math.abs(lengthDifference) : 0;
    const lengthAdded = lengthDifference > 0 ? lengthDifference : 0;

    const afterChangeStart = Math.max(0, beforeSelectionStart - lengthRemoved);
    const afterChangeEnd = Math.max(0, afterChangeStart + lengthAdded);

    const beforeReplaceStart = Math.max(
      0,
      beforeSelectionStart - lengthRemoved,
    );
    const beforeReplaceLength = beforeSelectionLength + lengthRemoved;

    const beforeResultTextLength = this.resultTextArray.length;

    let currentResultTextLength = this.resultTextArray.length;
    let currentResultSelectionStart = 0;
    let currentResultSelectionLength = 0;

    for (
      let i = 0;
      i < Math.min(beforeReplaceStart + beforeReplaceLength, mask.length);
      i++
    ) {
      if (this.maskChars.includes(mask[i]) && currentResultTextLength > 0) {
        currentResultTextLength -= 1;
        if (i < beforeReplaceStart) {
          currentResultSelectionStart += 1;
        }
        if (i >= beforeReplaceStart) {
          currentResultSelectionLength += 1;
        }
      }
    }

    const replacementText = afterText.substring(
      afterChangeStart,
      afterChangeEnd,
    );
    let targetCursorPosition = currentResultSelectionStart;
    if (replacementText.length === 0) {
      this.resultTextArray.removeRange(
        currentResultSelectionStart,
        currentResultSelectionStart + currentResultSelectionLength,
      );
    } else {
      if (currentResultSelectionLength > 0) {
        this.resultTextArray.removeRange(
          currentResultSelectionStart,
          currentResultSelectionStart + currentResultSelectionLength,
        );
        currentResultSelectionLength = 0;
      }
      this.resultTextArray.insert(currentResultSelectionStart, replacementText);
      targetCursorPosition += replacementText.length;
    }

    if (beforeResultTextLength === 0 && this.resultTextArray.length > 1) {
      let prefixLength = 0;
      for (let i = 0; i < mask.length; i++) {
        if (this.maskChars.includes(mask[i])) {
          prefixLength = i;
          break;
        }
      }
      if (prefixLength > 0) {
        const resultPrefix = this.resultTextArray.symbolArray.slice(
          0,
          prefixLength,
        );
        const effectivePrefixLength = Math.min(
          this.resultTextArray.length,
          resultPrefix.length,
        );
        for (let j = 0; j < effectivePrefixLength; j++) {
          if (mask[j] !== resultPrefix[j]) {
            this.resultTextArray.removeRange(0, j);
            break;
          }
          if (j === effectivePrefixLength - 1) {
            this.resultTextArray.removeRange(0, effectivePrefixLength);
            break;
          }
        }
      }
    }

    let curTextPos = 0;
    let maskPos = 0;
    this.resultTextMasked = '';
    let cursorPos = -1;
    let nonMaskedCount = 0;
    let maskInside = 0;

    while (maskPos < mask.length) {
      const curMaskChar = mask[maskPos];
      const isMaskChar = this.maskChars.includes(curMaskChar);

      let curTextInRange = curTextPos < this.resultTextArray.length;

      let curTextChar: string | undefined;
      if (isMaskChar && curTextInRange) {
        if (maskInside > 0) {
          this.resultTextArray.removeRange(curTextPos - maskInside, curTextPos);
          curTextPos -= maskInside;
        }
        maskInside = 0;
        while (curTextChar === undefined && curTextInRange) {
          const potentialTextChar = this.resultTextArray.at(curTextPos);
          if (
            this.maskFilter?.[curMaskChar]?.test(potentialTextChar) ??
            false
          ) {
            curTextChar = potentialTextChar;
          } else {
            this.resultTextArray.removeAt(curTextPos);
            curTextInRange = curTextPos < this.resultTextArray.length;
            if (curTextPos <= targetCursorPosition) {
              targetCursorPosition -= 1;
            }
          }
        }
      } else if (
        !isMaskChar &&
        !curTextInRange &&
        this.type === MaskAutoCompletionType.eager
      ) {
        curTextInRange = true;
      }

      if (isMaskChar && curTextInRange && curTextChar !== undefined) {
        this.resultTextMasked += curTextChar;
        if (curTextPos === targetCursorPosition && cursorPos === -1) {
          cursorPos = maskPos - nonMaskedCount;
        }
        nonMaskedCount = 0;
        curTextPos += 1;
      } else {
        if (!curTextInRange) {
          if (maskInside > 0) {
            curTextPos -= maskInside;
            maskInside = 0;
            nonMaskedCount = 0;
            continue;
          } else {
            break;
          }
        } else {
          this.resultTextMasked += mask[maskPos];
          if (
            !isMaskChar &&
            curTextPos < this.resultTextArray.length &&
            curMaskChar === this.resultTextArray.at(curTextPos)
          ) {
            if (this.type === MaskAutoCompletionType.lazy && lengthAdded <= 1) {
              // Nothing, as in the package.
            } else {
              maskInside++;
              curTextPos++;
            }
          } else if (maskInside > 0) {
            curTextPos -= maskInside;
            maskInside = 0;
          }
        }

        if (
          curTextPos === targetCursorPosition &&
          cursorPos === -1 &&
          !curTextInRange
        ) {
          cursorPos = maskPos;
        }

        if (
          this.type === MaskAutoCompletionType.lazy ||
          lengthRemoved > 0 ||
          currentResultSelectionLength > 0 ||
          beforeReplaceLength > 0
        ) {
          nonMaskedCount++;
        }
      }

      maskPos++;
    }

    if (nonMaskedCount > 0) {
      this.resultTextMasked = this.resultTextMasked.substring(
        0,
        this.resultTextMasked.length - nonMaskedCount,
      );
      cursorPos -= nonMaskedCount;
    }

    if (this.resultTextArray.length > this.maskLength) {
      this.resultTextArray.removeRange(
        this.maskLength,
        this.resultTextArray.length,
      );
    }

    const finalCursorPosition =
      cursorPos < 0 ? this.resultTextMasked.length : cursorPos;

    return {
      text: this.resultTextMasked,
      selection: { start: finalCursorPosition, end: finalCursorPosition },
    };
  }

  private calcMaskLength(): void {
    this.maskLength = 0;
    const mask = this.mask;
    if (mask !== undefined) {
      for (let i = 0; i < mask.length; i++) {
        if (this.maskChars.includes(mask[i])) {
          this.maskLength++;
        }
      }
    }
  }
}
