import { Directive } from 'vue'

interface EventInputTarget {
  target: HTMLInputElement
}

type FocusInputEvent = Omit<FocusEvent, 'target'> & EventInputTarget
type MouseInputEvent = Omit<MouseEvent, 'target'> & EventInputTarget
type ClipboardInputEvent = Omit<ClipboardEvent, 'target'> & EventInputTarget

export type IMASK_TOKEN_PATTERN = {
  [key: string]: RegExp
}

export const MASK_TOKEN_PATTERN: IMASK_TOKEN_PATTERN = {
  N: /[0-9]/,
  S: /[a-z]|[A-Z]/,
  A: /[0-9]|[a-z]|[A-Z]/,
  X: /.*/,
}
export type MASK_TOKEN = keyof typeof MASK_TOKEN_PATTERN
const DELETE_EVENTS = ['deleteContentBackward', 'deleteByCut']

export function getCustomMaskDirective(
  mapTokens = MASK_TOKEN_PATTERN
): Directive {
  return {
    mounted: (el, bindings: any, vnode) => {
      const mask = bindings.value.mask
      const model = bindings.value.model
      const shouldUnmask = bindings.modifiers.unmask
      const parseint = bindings.modifiers.parseint
      const initChange = bindings.modifiers['init-change']
      const hideOnEmpty = bindings.modifiers['hide-on-empty']
      const nInput = el.getElementsByTagName('input')
      const isNativeInput = vnode.type === 'input'
      if (!isNativeInput && nInput.length === 0) {
        throw new Error('Mask element must contains an input element inside')
      }
      const inputElement: HTMLInputElement = isNativeInput ? el : nInput[0]
      if (!mask) {
        throw new Error('Mask not provided')
      }
      new InputMaskDOMManiputalion(
        mapTokens,
        inputElement,
        mask,
        Boolean(shouldUnmask),
        Boolean(parseint),
        hideOnEmpty,
        initChange,
        (value: string | number) => {
          if (
            bindings.instance.$data &&
            bindings.instance.$data[model] !== undefined
          ) {
            bindings.instance.$data[model] = value
          } else if (bindings.instance[model] !== undefined) {
            bindings.instance[model] = value
          } else if (
            bindings.instance.state &&
            bindings.instance.state[model] !== undefined
          ) {
            bindings.instance.state[model] = value
          }
        }
      )
    },
  }
}

export const VMaskDirective: Directive = getCustomMaskDirective()

class InputMaskDOMManiputalion {
  private maskService: MaskLogic
  constructor(
    private mapTokens = MASK_TOKEN_PATTERN,
    private inputElement: HTMLInputElement,
    private mask: string,
    private shouldUnmask: boolean,
    private parseint: boolean,
    private hideOnEmpty: boolean,
    initChange: boolean,
    private updateModel: (value: string | number) => void
  ) {
    this.maskService = new MaskLogic(mask, mapTokens, parseint)
    const masked = this.maskService.maskTransform(inputElement.value)
    this.refreshInput(masked, inputElement)
    if (initChange) {
      this.formatAndEmit(masked)
    }
    this.initListeners()
  }

  refreshInput(
    text: string,
    inputElement: HTMLInputElement,
    selectionIndex = 0
  ) {
    const hasModifications =
      text !== this.maskService.trimMaskedText(this.mask, 0)
    const mustUpdate = !this.hideOnEmpty || hasModifications
    const action = () => {
      inputElement.value = mustUpdate ? text : ''
      inputElement.selectionStart = selectionIndex
      inputElement.selectionEnd = selectionIndex
    }
    setTimeout(() => action(), 0)
  }

  remask(text: string) {
    return this.maskService.maskTransform(this.maskService.unmaskToString(text))
  }

  onInput = (event: InputEvent) => {
    event.preventDefault()
    const target: HTMLInputElement | null = event?.target as HTMLInputElement
    const value = target.value
    const start = target.selectionStart || 0
    let finalValue = this.remask(value)
    let newSelectionIndex = this.maskService.getNextMaskKey(
      this.remask(value.substring(0, start))
    )
    if (DELETE_EVENTS.includes(event.inputType)) {
      let replaced = finalValue
      newSelectionIndex = this.maskService.getLastMaskIndex(
        finalValue,
        start - 1
      )
      if (event.inputType === 'deleteContentBackward') {
        if (this.mask[start] && !this.mapTokens[this.mask[start]]) {
          replaced = this.maskService.replaceAtRange(
            finalValue,
            ' ',
            newSelectionIndex
          )
          finalValue = this.remask(replaced)
        }
      }
      newSelectionIndex =
        this.maskService.getLastMaskIndex(replaced, start - 1) + 1
    }
    this.refreshInput(finalValue, target, newSelectionIndex)
    this.formatAndEmit(finalValue)
  }

  initListeners() {
    this.inputElement.addEventListener('input', this.onInput as any)
  }

  formatAndEmit(text: string) {
    let valueToEmit: string | number = text
    if (this.hideOnEmpty && text === this.mask) {
      valueToEmit = ''
    } else if (this.shouldUnmask) {
      valueToEmit = this.maskService.unmaskTransform(text)
    }
    if (!this.parseint || !isNaN(valueToEmit as number)) {
      this.updateModel(valueToEmit)
    } else if (this.parseint && isNaN(valueToEmit as number)) {
      this.updateModel('')
    }
  }
}

class MaskLogic {
  constructor(
    private mask: string,
    private mapTokens = MASK_TOKEN_PATTERN,
    private parseToInt = false
  ) {}

  maskTransform(value: string | number) {
    const text = (value || '') + ''
    let maskedInput = this.trimMaskedText(this.mask, 0)
    let lastIndex = 0
    for (let i = 0; i < this.mask.length; i++) {
      const pattern = this.mapTokens[this.mask[i]]
      if (pattern) {
        for (let j = lastIndex; j < text.length; j++) {
          if (text[j].match(pattern)) {
            maskedInput = this.replaceAtRange(maskedInput, text[j], i)
            lastIndex = j + 1
            break
          }
        }
      }
    }
    return maskedInput
  }

  trimMaskedText(maskedText: string, startIndex: number) {
    let newText = maskedText
    for (let i = startIndex; i < maskedText.length; i++) {
      const char = maskedText[i]
      if (this.mapTokens[char]) {
        newText = this.replaceAtRange(newText, ' ', i)
      }
    }
    return newText
  }

  getNextMaskKey(value: string) {
    for (let i = 0; i < value.length; i++) {
      if (value[i] === ' ' && this.mapTokens[this.mask[i]]) {
        return i
      }
    }
    return value.length
  }

  getLastMaskIndex(value: string, fromIndex: number) {
    let lastMaskIndex = 0
    for (let i = fromIndex; i >= 0; i--) {
      const pattern = this.mapTokens[this.mask[i]]
      if (pattern) {
        lastMaskIndex = i
        if (value[i].match(pattern)) {
          return i
        }
      }
    }
    return lastMaskIndex
  }

  replaceAtRange(
    origString: string,
    replaceChar: string,
    indexStart: number,
    indexEnd = -1
  ) {
    return (
      origString.substr(0, indexStart) +
      replaceChar +
      origString.substr(indexEnd === -1 ? indexStart + 1 : indexEnd)
    )
  }

  unmaskToString(text: string) {
    let newText = ''
    let lastValueIndex = 0
    for (let i = 0; i < this.mask.length; i++) {
      const pattern = this.mapTokens[this.mask[i]]
      if (pattern) {
        for (let j = lastValueIndex; j < text.length; j++) {
          if (text[j]?.match(pattern)) {
            newText += text[j]
            lastValueIndex = j + 1
          }
        }
      }
    }
    return newText
  }

  unmaskTransform(text: string) {
    const newText = this.unmaskToString(text)
    return this.parseToInt ? parseInt(newText) : newText
  }
}

export function unmaskTransform(
  value: string,
  mask: string,
  mapTokens = MASK_TOKEN_PATTERN,
  parseToInt = false
) {
  return new MaskLogic(mask, mapTokens, parseToInt).unmaskTransform(value)
}

export function maskTransform(
  value: string,
  mask: string,
  mapTokens = MASK_TOKEN_PATTERN
) {
  return new MaskLogic(mask, mapTokens, false).maskTransform(value)
}
