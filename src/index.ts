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
  X: /.*/
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
    }
  }
}

export const VMaskDirective: Directive = getCustomMaskDirective()

class InputMaskDOMManiputalion {
  private isKeyboardEvent = false
  private maskService: MaskLogic
  constructor(
    mapTokens = MASK_TOKEN_PATTERN,
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
    this.refreshInput(masked, null, 0, true)
    if (initChange) {
      this.formatAndEmit(masked)
    }
    this.initListeners()
  }

  refreshInput(
    text: string,
    event?:
      | MouseInputEvent
      | FocusInputEvent
      | InputEvent
      | ClipboardInputEvent
      | null,
    selectionIndex = 0,
    putIntoTimeout = false
  ) {
    const hasModifications =
      text !== this.maskService.trimMaskedText(this.mask, 0)
    const mustUpdate = !this.hideOnEmpty || hasModifications
    const eventType = event?.type
    const action = () => {
      const inputElement: HTMLInputElement =
        (event?.target as HTMLInputElement) || this.inputElement
      inputElement.value = mustUpdate ? text : ''
      inputElement.selectionStart = selectionIndex
      inputElement.selectionEnd = selectionIndex
    }
    if (putIntoTimeout || (!mustUpdate && eventType === 'keyup')) {
      setTimeout(() => action(), 0)
    } else {
      action()
    }
  }

  appendTextAtIndex(originalText: string, text: string, index: number) {
    return (
      originalText.substring(0, index) + text + originalText.substring(index)
    )
  }

  getValueAndIndexAfterInsertAt(
    text: string,
    index: number,
    textToInsert: string
  ) {
    const unmaskAll = this.maskService.unmaskTransform(text) as string
    const unmaskUntilIndex = this.maskService.unmaskTransform(
      text.substr(0, index)
    ) as string
    const maskedUntilIndexWithChar = this.maskService.maskTransform(
      unmaskUntilIndex + textToInsert
    )
    const valueWithChar = this.appendTextAtIndex(
      unmaskAll,
      textToInsert,
      unmaskUntilIndex.length
    )
    const newValue = this.maskService.maskTransform(valueWithChar)
    const nextkey = this.maskService.getNextMaskKey(maskedUntilIndexWithChar)
    return {
      index: nextkey?.index || this.mask.length,
      text: newValue
    }
  }

  onInput = (event: InputEvent) => {
    event.preventDefault()
    const key = event.data || ''
    const target: HTMLInputElement | null = event?.target as HTMLInputElement
    const value = target.value
    const start = target.selectionStart || 0
    const end = target.selectionEnd || 0
    if (DELETE_EVENTS.includes(event.inputType)) {
      const diff = Math.abs(start - end)
      const isNotSelectionEvent = diff === 0
      const newSelectionStart = isNotSelectionEvent ? start - 1 : start
      if (target.selectionStart === 0 && isNotSelectionEvent) {
        return
      }
      const newText = this.maskService.replaceAtRange(
        value,
        Array(isNotSelectionEvent ? 1 : diff)
          .fill(' ')
          .join(''),
        newSelectionStart,
        end
      )
      const unmasked = this.maskService.unmaskTransform(newText) as string
      const text = this.maskService.maskTransform(unmasked)
      this.refreshInput(
        text,
        event,
        newSelectionStart < 0 ? 0 : newSelectionStart,
        this.shouldUnmask
      )
      this.formatAndEmit(this.hideOnEmpty && !unmasked.length ? '' : text)
    } else {
      const { text, index } = this.getValueAndIndexAfterInsertAt(
        value,
        start,
        key
      )
      this.refreshInput(text, event, index, this.shouldUnmask)
      this.formatAndEmit(text)
    }
  }

  onMouseEvent = (event: MouseEvent & EventInputTarget) => {
    const text = this.shouldUnmask
      ? event.target.value
      : this.maskService.unmaskTransform(event.target.value)
    const masked = this.maskService.maskTransform(text)
    const nextMaskKey = this.maskService.getNextMaskKey(masked)
    const newSelectionIndex =
      nextMaskKey?.index || event.target.selectionEnd || 0
    this.refreshInput(masked, event, newSelectionIndex)
  }

  initListeners() {
    const inputElement = this.inputElement
    inputElement.addEventListener('beforeinput', this.onInput as any)
    this.inputElement.onblur = this.inputElement.onfocus = this.inputElement.onclick = this
      .onMouseEvent as any
  }

  formatAndEmit(text: string) {
    let valueToEmit: string | number = text
    if (this.shouldUnmask) {
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
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextMaskKey = this.getNextMaskKey(maskedInput)
      if (nextMaskKey) {
        const { token, index: tokenIndex } = nextMaskKey
        if (char.match(this.mapTokens[token])) {
          maskedInput = this.replaceAtRange(maskedInput, char, tokenIndex)
        }
      } else {
        break
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
        return {
          token: this.mask[i],
          index: i
        }
      }
    }
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

  unmaskTransform(text: string) {
    let newText = ''
    for (let i = 0; i < this.mask.length; i++) {
      const pattern = this.mapTokens[this.mask[i]]
      if (pattern) {
        if (text[i]?.match(pattern)) {
          newText += text[i]
        }
      }
    }
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
