import * as t from "https://deno.land/std/testing/asserts.ts";
import { SParse, SyntaxError } from "./index.js";

Deno.test("test", () => {
  t.assertEquals(SParse('((a b c)(()()))'), [['a','b','c'],[[],[]]]);
  t.assertEquals(SParse('((a b c) (() ()))'), [['a','b','c'],[[],[]]]);
  t.assertEquals(SParse("((a 'b 'c))"), [['a',['quote','b'],['quote','c']]]);
  t.assertEquals(SParse("(a '(a b c))"),  ['a', ['quote', ['a', 'b', 'c']]]);
  t.assertEquals(SParse("(a ' (a b c))"), ['a', ['quote', ['a', 'b', 'c']]]);
  t.assertEquals(SParse("(a '' (a b c))"), ['a', ['quote', ['quote', ['a', 'b', 'c']]]], 'Multiple quotes should not be flattened');
  t.assertEquals(SParse("((a `b `c))"), [['a',['quasiquote','b'],['quasiquote','c']]]);
  t.assertEquals(SParse("(a `(a b c))"),  ['a', ['quasiquote', ['a', 'b', 'c']]]);
  t.assertEquals(SParse("(a ` (a b c))"), ['a', ['quasiquote', ['a', 'b', 'c']]]);
  t.assertEquals(SParse("(a `` (a b c))"), ['a', ['quasiquote', ['quasiquote', ['a', 'b', 'c']]]], 'Multiple quasiquotes should not be flattened');
  t.assertEquals(SParse("((a ,b ,c))"), [['a',['unquote','b'],['unquote','c']]]);
  t.assertEquals(SParse("(a ,(a b c))"),  ['a', ['unquote', ['a', 'b', 'c']]]);
  t.assertEquals(SParse("(a , (a b c))"), ['a', ['unquote', ['a', 'b', 'c']]]);
  t.assertEquals(SParse("(a ,, (a b c))"), ['a', ['unquote', ['unquote', ['a', 'b', 'c']]]], 'Multiple unquotes should not be flattened');
  t.assertEquals(SParse("((a ,@b ,@c))"), [['a',['unquote-splicing','b'],['unquote-splicing','c']]]);
  t.assertEquals(SParse("(a ,@(a b c))"),  ['a', ['unquote-splicing', ['a', 'b', 'c']]]);
  t.assertEquals(SParse("(a ,@ (a b c))"), ['a', ['unquote-splicing', ['a', 'b', 'c']]]);
  t.assertEquals(SParse("(a ,@,@ (a b c))"), ['a', ['unquote-splicing', ['unquote-splicing', ['a', 'b', 'c']]]], 'Multiple unquote-splicings should not be flattened');
  t.assert(SParse("()()") instanceof SyntaxError, 'Any character after a complete expression should be an error');
  t.assert(SParse("((a) b))") instanceof SyntaxError, 'Any character after a complete expression should be an error');
  t.assert(SParse("((a))abc") instanceof SyntaxError, 'Any character after a complete expression should be an error');
  t.assert(SParse("(')") instanceof SyntaxError, 'A \' without anything to quote should be an error');
  t.assertEquals(SParse("'()"), ['quote', []], 'A quoted empty list should parse');
  t.assertEquals(SParse("()"), [], 'An empty list should parse');
  t.assertEquals(SParse("'a"), ['quote', 'a'], 'A quoted atom should parse');
  t.assertEquals(SParse("'(a)"), ['quote', ['a']], 'A quoted atom in a list should parse');
  t.assertEquals(SParse("a"), 'a', 'An atom should parse');
  t.assertEquals(SParse("(a'b)"), ['a', ['quote', 'b']], 'Quote should act symbol delimiting');
  t.assertEquals(SParse("(a`b)"), ['a', ['quasiquote', 'b']], 'Quasiquote should act symbol delimiting');
  t.assertEquals(SParse("(a,b)"), [ 'a', ['unquote', 'b']], 'Unquote should act symbol delimiting');
  t.assertEquals(SParse("(a,@b)"), ['a', ['unquote-splicing', 'b']], 'Unquote-splicing should act symbol delimiting');
  t.assertEquals(SParse("(a\\'b)"), ['a\'b'], 'Escaped quotes in symbols should parse');
  t.assertEquals(SParse("(a\\\"b)"), ['a\"b'], 'Escaped quotes in symbols should parse');
  t.assertEquals(SParse("(a\\\\b)"), ['a\\b'], 'Escaped \\ in symbols should parse as \\');
  t.assertEquals(SParse("(a\\b)"), ['ab'], 'Escaped normal characters in symbols should parse as normal');

  var error = SParse("(\n'");
  t.assert(error instanceof SyntaxError, "Parsing (\\n' Should be an error");
  t.assert(error.line == 2, "line should be 2");
  t.assert(error.col == 2, "col should be 2");

  error = SParse("(\r\n'");
  t.assert(error instanceof SyntaxError, "Parsing (\\r\\n' Should be an error");
  t.assert(error.line == 2, "line should be 2");
  t.assert(error.col == 2, "col should be 1");

  t.assertEquals(SParse('(a "a")'), ['a', new String('a')], 'Strings should parse as String objects');
  t.assertEquals(SParse('(a"s"b)'), ['a', new String('s'), 'b'], 'Strings should act symbol delimiting');
  t.assertEquals(SParse('(a\\"s\\"b)'), ['a"s"b'], 'Escaped double quotes in symbols should parse');
  t.assertEquals(SParse('(a "\\"\n")'), ['a', new String('"\n')], 'Escaped double quotes \\" should work in Strings');
  t.assertEquals(SParse('(a "\\\\")'), ['a', new String('\\')], 'Escaped \\ should work in Strings');
  t.assertEquals(SParse('(a "\\a")'), ['a', new String('a')], 'Escaped characters should work in Strings');
  t.assert(SParse('(a "string)') instanceof SyntaxError, 'Prematurely ending strings should produce an error');
  t.assert(SParse('\'"string"', ['quote', new String('string')], 'A quoted string should parse'));

  error = SParse("(\"a)");
  t.assert(error instanceof SyntaxError);
  t.assert(error.message == "Syntax error: Unterminated string literal", error.message);

  t.assertEquals(SParse('  a   '), 'a', 'Whitespace should be ignored');
  t.assertEquals(SParse('    '), '', 'The empty expression should parse');

  SParse.Parser.string_delimiters = /['"]/;
  SParse.Parser.string_or_escaped_or_end = /^(\\|"|'|$)/;
  SParse.Parser.quotes = /[`,]/;
  delete SParse.Parser.quotes_map["'"];

  t.assertEquals(SParse("'abc'"), new String('abc'), 'String delimiters should be modifiable');
  t.assertEquals(SParse("('abc\"def' \"123'\")"), [new String('abc"def'), new String("123'")], 'Multiple string delimiters should not influence each other');
});
