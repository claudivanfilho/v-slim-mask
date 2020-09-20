# V-SLIM-MASK

A incredibly lighter input mask directive and filter compatible with **Vue 3**

<!-- ![github start](https://badgen.net/github/stars/claudivanfilho/v-mask-directive-filter) -->

![npm version](https://badgen.net/npm/v/v-slim-mask)
![Min](https://badgen.net/bundlephobia/min/v-slim-mask)
![Min Gziped](https://badgen.net/bundlephobia/minzip/v-slim-mask)

![Travis Build](https://travis-ci.org/claudivanfilho/v-slim-mask.svg?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/claudivanfilho/v-mask-directive-filter/badge.svg?targetFile=package.json)](https://snyk.io/test/github/claudivanfilho/v-slim-mask?targetFile=package.json)

## Instalation

```shell
$ yarn add v-slim-mask

or

$ npm install --save v-slim-mask
```

### Directive

```javascript
// Import the directive inside your main.(js|ts)

import { VMaskDirective } from 'v-slim-mask'

createApp(App).directive('mask', VMaskDirective).mount('#app')
```

## Config

### Tokens

| Token | Pattern                 | Description       |
| ----- | ----------------------- | ----------------- |
| N     | [0-9]                   | numbers only      |
| S     | [a-z] \| [A-Z]          | string a-z only   |
| A     | [0-9] \| [a-z] \| [A-Z] | alphanumeric only |
| X     | .\*                     | any char          |

#### OBS: You can pass your own token pattern map through the method **getMaskDirectiveCustom**

### Modifiers

| Modifier | Default | Description                                |
| -------- | ------- | ------------------------------------------ |
| unmask   | false   | unmask the return value to the model       |
| parseint | false   | parse to int the return value to the model |

## Usage

### Using native input element

```html
// Inside your .vue component

<template>
  <input v-model="cpf" v-mask="{mask: 'NNN.NNN.NNN-NN', model: 'cpf' }" />
</template>

// Entry => 99999999999 | cpf => "999.999.999-99"
```

### Using in a parent input element

```html
<template>
  <BaseInputComponent
    :myfield="cpf"
    v-mask="{mask: 'NNN.NNN.NNN-NN', model: 'cpf' }"
  />
</template>

// BaseInputComponent.vue
<template>
  <div>
    <label>Base label</label>
    <input />
  </div>
</template>

// Entry => 99999999999 | cpf => "999.999.999-99"
```

### Using helper functions

```javascript

<script>
  import { maskTransform, unmaskTransform } from 'v-mask-directive-filter'
  export default Vue.extends({
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
