# V-SLIM-MASK

A incredibly **LIGHTER** input mask directive and filter compatible with **Vue 3**

<!-- ![github start](https://badgen.net/github/stars/claudivanfilho/v-mask-directive-filter) -->

![npm version](https://badgen.net/npm/v/v-slim-mask)
![Min](https://badgen.net/bundlephobia/min/v-slim-mask)
![Min Gziped](https://badgen.net/bundlephobia/minzip/v-slim-mask)

![Travis Build](https://travis-ci.org/claudivanfilho/v-slim-mask.svg?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/claudivanfilho/v-slim-mask/badge.svg?targetFile=package.json)](https://snyk.io/test/github/claudivanfilho/v-slim-mask?targetFile=package.json)

## Browsers support

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="IE / Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>IE / Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Firefox | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome Android | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Safari | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari-ios/safari-ios_48x48.png" alt="iOS Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>iOS Safari | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/opera/opera_48x48.png" alt="Opera" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Opera |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IE9>, Edge                                                                                                                                                                                                      | 6>                                                                                                                                                                                                                | 1>                                                                                                                                                                                                            | 18>                                                                                                                                                                                                                   | 3.1>                                                                                                                                                                                                          | 2>                                                                                                                                                                                                                            | 12>                                                                                                                                                                                                       |

## Instalation

```shell
$ yarn add v-slim-mask

or

$ npm install --save v-slim-mask
```

```javascript
// Import the directive inside your main.(js|ts)

import { VMaskDirective } from 'v-slim-mask'

createApp(App).directive('mask', VMaskDirective).mount('#app')
```

or

```javascript
// using a custom directive

import { getCustomMaskDirective } from 'v-slim-mask'

const VMASKCustomDirective = getCustomMaskDirective({
  '#': /[0-9]/,
  Z: /[a-z]|[A-Z]/,
})
createApp(App).directive('mask', VMASKCustomDirective).mount('#app')
```

## Config

### Tokens

| Token | Pattern                 | Description            |
| ----- | ----------------------- | ---------------------- |
| N     | [0-9]                   | numbers only           |
| S     | [a-z] \| [A-Z]          | string a-z or A-Z only |
| A     | [0-9] \| [a-z] \| [A-Z] | alphanumeric only      |
| C     | [^ ]                    | required char          |
| X     | .\*                     | optional char          |

### Modifiers

| Modifier      | Default | Description                                |
| ------------- | ------- | ------------------------------------------ |
| unmask        | false   | unmask the return value to the model       |
| parseint      | false   | parse to int the return value to the model |
| init-change   | false   | apply the mask to the model on start       |
| hide-on-empty | false   | hide the mask if no value                  |

## Usage

### Using native input element

```html
// Inside your .vue component

<template>
  <input v-mask="{mask: 'NNN.NNN.NNN-NN', model: 'cpf' }" />
</template>

<script>
  import { defineComponent } from 'vue'
  export default defineComponent({
    data() {
      return {
        cpf: '',
      }
    },
  })
</script>

// Entry => 99999999999 | cpf => "999.999.999-99"
```

### Using in a parent input element

```html
<template>
  <BaseInputComponent v-mask="{mask: 'NNN.NNN.NNN-NN', model: 'cpf' }" />
</template>

<script>
  import { defineComponent } from 'vue'
  export default defineComponent({
    data() {
      return {
        cpf: '',
      }
    },
  })
</script>

// Entry => 99999999999 | cpf => "999.999.999-99"
```

```html
// BaseInputComponent.vue
<template>
  <div>
    <label>Base label</label>
    <input />
  </div>
</template>
```

### Using Composition API

```html
// using reactive
<template>
  <input v-mask="{mask: 'NNN.NNN.NNN-NN', model: 'cpf' }" />
</template>

<script>
  import { reactive } from 'vue'
  export default {
    setup() {
      const state = reactive({
        cpf: '', // cannot be undefined
      })

      return state
    },
  }
</script>

// Entry => 99999999999 | cpf => "999.999.999-99"
```

```html
// using ref
<template>
  <input v-mask="{mask: 'NNN.NNN.NNN-NN', model: 'cpf' }" />
</template>

<script>
  import { ref } from 'vue'
  export default {
    setup() {
      return { cpf: ref('') } // cannot be undefined
    },
  }
</script>

// Entry => 99999999999 | cpf => "999.999.999-99"
```

```html
// BaseInputComponent.vue
<template>
  <div>
    <label>Base label</label>
    <input />
  </div>
</template>
```

### Using helper functions

```javascript

<script>
  import { defineComponent } from "vue";
  import { maskTransform, unmaskTransform } from 'v-slim-mask'

  export default defineComponent({
    computed: {
      phoneFormatted(val) {
        return maskTransform(val, '(NN) NNNNN - NNNN')
      }
    }
  })
</script>

```

## Demo

### Vue 3.0.0 Sample

https://codesandbox.io/s/vue-3-v-slim-mask-wy3po?file=/src/App.vue
