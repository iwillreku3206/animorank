import { describe, expect, it } from 'vitest';
import { buildCompileScript, buildRunScript, parseFileOutputs } from './judge0';
import type { ProcessRequest } from './types';

const processes: ProcessRequest[] = [
  { command: 'gcc', args: ['-Wall', '-o', 'main', 'main.c'] },
  { command: './main', args: [] }
];

describe('buildCompileScript', () => {
  it('emits one quoted line per process except the last', () => {
    expect(buildCompileScript(processes)).toBe("'gcc' '-Wall' '-o' 'main' 'main.c'");
  });

  it('returns empty string with fewer than 2 processes', () => {
    expect(buildCompileScript([{ command: './main', args: [] }])).toBe('');
  });

  it('quotes arguments with spaces, quotes, and metacharacters', () => {
    const script = buildCompileScript([
      { command: 'gcc', args: ['-o', 'my program', "it's", '$HOME'] },
      { command: './main', args: [] }
    ]);
    expect(script).toBe("'gcc' '-o' 'my program' 'it'\\''s' '$HOME'");
  });
});

describe('buildRunScript', () => {
  it('emits the last process command line plus a begin/cat/end marker triple per export file', () => {
    expect(buildRunScript(processes, ['__ar_test_return', '__ar_test_param0'])).toBe(
      [
        "'./main'",
        `printf '<<<__AR_FILE_BEGIN:%s>>>\\n' '__ar_test_return'`,
        `cat '__ar_test_return'`,
        `printf '<<<__AR_FILE_END:%s>>>\\n' '__ar_test_return'`,
        `printf '<<<__AR_FILE_BEGIN:%s>>>\\n' '__ar_test_param0'`,
        `cat '__ar_test_param0'`,
        `printf '<<<__AR_FILE_END:%s>>>\\n' '__ar_test_param0'`
      ].join('\n')
    );
  });

  it('quotes export file paths in the marker triple', () => {
    const script = buildRunScript(processes, ['weird name.c']);
    expect(script).toContain(`cat 'weird name.c'`);
    expect(script).not.toContain(`cat "weird name.c"`);
  });
});

describe('parseFileOutputs', () => {
  it('round-trips content for multiple files', () => {
    // cat emits content verbatim, so the end marker directly follows it
    const stdout = Buffer.from(
      [
        'some program output',
        `<<<__AR_FILE_BEGIN:__ar_test_return>>>`,
        `5<<<__AR_FILE_END:__ar_test_return>>>`,
        `<<<__AR_FILE_BEGIN:__ar_test_param0>>>`,
        `3<<<__AR_FILE_END:__ar_test_param0>>>`,
        ''
      ].join('\n'),
      'utf8'
    );

    expect(parseFileOutputs(stdout)).toEqual([
      { path: '__ar_test_return', content: Buffer.from('5', 'utf8') },
      { path: '__ar_test_param0', content: Buffer.from('3', 'utf8') }
    ]);
  });

  it('returns an empty array for stdout without markers', () => {
    expect(parseFileOutputs(Buffer.from('just some output\n', 'utf8'))).toEqual([]);
  });
});
