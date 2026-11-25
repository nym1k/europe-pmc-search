import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from './App.vue'

describe('App', () => {
  it('mounts and renders a heading', () => {
    const wrapper = mount(App)
    expect(wrapper.find('h1').exists()).toBe(true)
  })
})
