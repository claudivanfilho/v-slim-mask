import { maskTransform, unmaskTransform } from '../src/index';

test('Test maskTransform method', () => {
  expect(maskTransform('1234', '(N) NNN')).toBe('(1) 234');
  expect(maskTransform('1234', '(N) NNA')).toBe('(1) 234');
  expect(maskTransform('1234', '(A) AAA')).toBe('(1) 234');
  expect(maskTransform('1234', '(S) SSS')).toBe('( )    ');
  expect(maskTransform('1234', '(X) XXX')).toBe('(1) 234');
  expect(maskTransform('-*()', '(X) XXX')).toBe('(-) *()');
  expect(maskTransform('', '(N) NNN')).toBe('( )    ');
  expect(maskTransform('1234', '')).toBe('');
});

test('Test unmaskTransform method', () => {
  expect(unmaskTransform('(1) 234', '(N) NNN')).toBe('1234');
  expect(unmaskTransform('(1) 234', '(N) NNA')).toBe('1234');
  expect(unmaskTransform('(1) 234', '(A) AAA')).toBe('1234');
  expect(unmaskTransform('(1) 234', '(S) SSS')).toBe('');
  expect(unmaskTransform('(1) 234', '(X) XXX')).toBe('1234');
  expect(unmaskTransform('(-) *()', '(X) XXX')).toBe('-*()');
});
