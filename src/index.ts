import { Directive } from 'vue'

export const MASK_TOKEN_PATTERN = {
  N: /[0-9]/,
  S: /[a-z]|[A-Z]/,
  A: /[0-9]|[a-z]|[A-Z]/,
  X: /.*/,
}
export type MASK_TOKEN = keyof typeof MASK_TOKEN_PATTERN

type IMASK_TOKEN_PATTERN = {
  [key: string]: RegExp
}

const KEYBOARD_GHOST_KEYS = [
  'ArrowUp',
  'ArrowDown',
  'ArrowRight',
  'ArrowLeft',
  'Tab',
  'Enter',
  'Shift',
  'Alt',
  'Escape',
  'CapsLock',
  'Dead',
  'Meta',
]

const KEYS_BLOCKED = ['Backspace', 'Dead']

const KEYBOARD_PRESSED_KEYS = [
  'Meta',
  'Control',
  'Shift',
  'ArrowRight',
  'ArrowLeft',
]

export function getCustomMaskDirective(
  mapTokens: IMASK_TOKEN_PATTERN = MASK_TOKEN_PATTERN
): Directive {
  return {
    mounted: (el: any, bindings: any, vnode: any) => {
      const mask = bindings.value.mask
      const model: string = bindings.value.model
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
      new InputMask(
        mapTokens,
        isNativeInput,
        inputElement,
        mask,
        Boolean(shouldUnmask),
        Boolean(parseint),
        hideOnEmpty,
        initChange,
        (value: string | number) => {
          if (
            bindings.instance?.$data &&
            bindings.instance?.$data[model] !== undefined
          ) {
            bindings.instance.$data[model] = value
          } else if (bindings.instance[model] !== undefined) {
            bindings.instance[model] = value
          } else if (
            bindings.instance?.state &&
            bindings.instance?.state[model] !== undefined
          ) {
            bindings.instance.state[model] = value
          }
        }
      )
    },
  }
}

export const VMaskDirective: Directive = getCustomMaskDirective()

class InputMask {
  private isKeyboardEvent = false
  constructor(
    private mapTokens: IMASK_TOKEN_PATTERN = MASK_TOKEN_PATTERN,
    private isNativeInput: boolean,
    private inputElement: HTMLInputElement,
    private mask: string,
    private shouldUnmask: boolean,
    private parseint: boolean,
    private hideOnEmpty: boolean,
    private initChange: boolean,
    private updateModel: (value: string | number) => void
  ) {
    this.refreshInput(
      maskTransform(inputElement.value, mask, mapTokens),
      null,
      0,
      true
    )
    if (initChange) {
      this.formatAndEmit(maskTransform(inputElement.value, mask, mapTokens))
    }
    this.initListeners()
  }

  /**
   * Updates the input element with the text masked
   *
   * @param text text masked
   * @param event (optional) click, blur or focus event
   * @param putIntoTimeout (default is false) Necessary to vuetify use with unmask active
   */
  refreshInput(
    text: string,
    event?: MouseEvent | FocusEvent | KeyboardEvent | null,
    selectionIndex = 0,
    putIntoTimeout = false
  ) {
    const mustUpdate =
      !this.hideOnEmpty || text !== trimMaskedText(this.mask, 0, this.mapTokens)
    const action = () => {
      const inputElement: HTMLInputElement =
        (event?.target as HTMLInputElement) || this.inputElement
      if (mustUpdate) {
        inputElement.value = text
      } else {
        inputElement.value = ''
      }
      const newSelectionIndex =
        event?.type === 'click' || event?.type === 'focus'
          ? onClickInput(
              text,
              this.mask,
              inputElement.selectionStart || 0,
              this.mapTokens
            ).selectionIndex
          : selectionIndex
      inputElement.selectionStart = newSelectionIndex
      inputElement.selectionEnd = newSelectionIndex
    }
    if (putIntoTimeout || (!mustUpdate && event?.type === 'keyup')) {
      setTimeout(() => action(), 0)
    } else {
      action()
    }
  }

  onKeyUp = (event: any) => {
    const key = event.key
    const start = event.target.selectionStart
    const end = event.target.selectionEnd
    const diff = Math.abs(start - end)
    if (key === 'Backspace') {
      const newSelectionStart = diff === 0 ? start - 1 : start
      const newText = replaceAtRange(
        event.target.value,
        Array(diff === 0 ? 1 : diff)
          .fill(' ')
          .join(''),
        newSelectionStart,
        end
      )
      const unmasked = unmaskTransform(
        newText,
        this.mask,
        false,
        this.mapTokens
      ) as string
      const text = maskTransform(unmasked, this.mask, this.mapTokens)
      this.refreshInput(
        text,
        event,
        newSelectionStart < 0 ? 0 : newSelectionStart,
        this.shouldUnmask
      )
      this.formatAndEmit(this.hideOnEmpty && !unmasked.length ? '' : text)
    } else if (diff === 0) {
      const unmask = unmaskTransform(
        event.target.value,
        this.mask,
        false,
        this.mapTokens
      ) as string
      const masked = maskTransform(unmask, this.mask, this.mapTokens)
      const diffText = masked.length - event.target.value.length
      this.refreshInput(
        masked,
        event,
        diffText === 0 ? start : start - Math.abs(diffText)
      )
    }
    if (KEYBOARD_PRESSED_KEYS.includes(key)) {
      this.isKeyboardEvent = false
    }
  }

  onKeyDown = (event: any) => {
    const key = event.key
    if (!this.isKeyboardEvent && KEYBOARD_PRESSED_KEYS.includes(key)) {
      this.isKeyboardEvent = true
    }
    if (this.isKeyboardEvent && key === 'v') {
      return
    }
    if (!this.isKeyboardEvent && !KEYBOARD_GHOST_KEYS.includes(key)) {
      event.preventDefault()
    }
    if (!KEYBOARD_GHOST_KEYS.includes(key) && !KEYS_BLOCKED.includes(key)) {
      const { value, selectionIndex: newSelectionIndex } = onAddCharToMask(
        this.parseint
          ? maskTransform(event.target.value, this.mask, this.mapTokens)
          : maskTransform(
              unmaskTransform(event.target.value, this.mask) as string,
              this.mask
            ),
        this.mask,
        event?.target.selectionStart || 0,
        key,
        this.mapTokens
      )
      this.refreshInput(value, event, newSelectionIndex, this.shouldUnmask)
      this.formatAndEmit(value)
    }
  }

  onPaste = async (event: any) => {
    let text = this.shouldUnmask
      ? event?.target?.value
      : unmaskTransform(event?.target?.value, this.mask, false, this.mapTokens)
    if (event.type === 'paste') {
      const clipboard = await navigator.clipboard.readText()
      if (clipboard.length === this.mask.length) {
        const unmask = unmaskTransform(
          clipboard,
          this.mask,
          false,
          this.mapTokens
        ) as string
        text = maskTransform(unmask, this.mask, this.mapTokens)
      } else {
        const masked = maskTransform(clipboard, this.mask, this.mapTokens)
        text =
          masked.length === this.mask.length
            ? masked
            : maskTransform(
                unmaskTransform(clipboard, this.mask, false, this.mapTokens),
                this.mask,
                this.mapTokens
              )
      }
    }
    this.refreshInput(
      maskTransform(text, this.mask, this.mapTokens),
      event,
      event.target.selectionEnd
    )
  }

  initListeners() {
    this.inputElement.onkeyup = this.onKeyUp
    this.inputElement.onkeydown = this.onKeyDown
    this.inputElement.onpaste = this.inputElement.onblur = this.inputElement.onfocus = this.inputElement.onclick = this.onPaste
  }

  formatAndEmit(text: string) {
    let valueToEmit: string | number = text
    if (this.shouldUnmask) {
      valueToEmit = unmaskTransform(
        text,
        this.mask,
        this.parseint,
        this.mapTokens
      )
    }
    if (!this.parseint || !isNaN(valueToEmit as number)) {
      this.updateModel(valueToEmit)
    } else if (this.parseint && isNaN(valueToEmit as number)) {
      this.updateModel('')
    }
  }
}

export function maskTransform(
  value: string | number,
  mask: string,
  mapTokens: IMASK_TOKEN_PATTERN = MASK_TOKEN_PATTERN
) {
  const text = (value || '') + ''
  let maskedInput = trimMaskedText(mask, 0, mapTokens)
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextMaskKey = getNextMaskKey(maskedInput, mask, mapTokens)
    if (nextMaskKey) {
      const { token, index: tokenIndex } = nextMaskKey
      if (char?.match(mapTokens[token])) {
        maskedInput = replaceAtRange(maskedInput, char, tokenIndex)
      }
    } else {
      break
    }
  }
  return maskedInput
}

function trimMaskedText(
  maskedText: string,
  startIndex: number,
  mapTokens: IMASK_TOKEN_PATTERN = MASK_TOKEN_PATTERN
) {
  let newText = maskedText
  for (let i = startIndex; i < maskedText.length; i++) {
    const char = maskedText[i]
    if (mapTokens[char]) {
      newText = replaceAtRange(newText, ' ', i)
    }
  }
  return newText
}

function getNextMaskKey(
  value: string,
  mask: string,
  mapTokens: IMASK_TOKEN_PATTERN = MASK_TOKEN_PATTERN
) {
  for (let i = 0; i < value.length; i++) {
    if (value[i] === ' ' && mapTokens[mask[i]]) {
      return {
        token: mask[i],
        index: i,
      }
    }
  }
}

function onClickInput(
  value: string,
  mask: string,
  selectionIndex: number,
  mapTokens: IMASK_TOKEN_PATTERN = MASK_TOKEN_PATTERN
) {
  const nextMaskKey = getNextMaskKey(value, mask, mapTokens)
  return {
    selectionIndex: nextMaskKey?.index || selectionIndex,
  }
}

function onAddCharToMask(
  value: string,
  mask: string,
  selectionIndex: number,
  key: string,
  mapTokens: IMASK_TOKEN_PATTERN = MASK_TOKEN_PATTERN
) {
  let newValue = value
  let newSelectionIndex = selectionIndex
  const nextMaskKey = getNextMaskKey(value, mask, mapTokens)
  if (nextMaskKey) {
    const { token, index } = nextMaskKey
    const pattern = mapTokens[token]
    if (pattern && key?.match(pattern)) {
      newValue = replaceAtRange(newValue, key, index)
      newSelectionIndex = index + 1
    }
  }
  return {
    value: newValue,
    selectionIndex: newSelectionIndex,
  }
}

function replaceAtRange(
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

export function unmaskTransform(
  text: string,
  mask: string,
  parseToInt = false,
  mapTokens: IMASK_TOKEN_PATTERN = MASK_TOKEN_PATTERN
) {
  let newText = ''
  for (let i = 0; i < mask.length; i++) {
    const pattern = mapTokens[mask[i]]
    if (pattern) {
      if (text[i]?.match(pattern)) {
        newText += text[i]
      }
    }
  }
  return parseToInt ? parseInt(newText) : newText
}
