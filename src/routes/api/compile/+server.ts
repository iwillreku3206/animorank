import { PISTON_BASE_URL } from '$env/static/private';
import type { PistonExecuteResponse, PistonExecutionResult } from '$lib/types/piston';
import type { RequestHandler } from './$types';
import { z } from 'zod';

const validator = z.object({
  code: z.string()
});

export const POST: RequestHandler = async (
	/** @type {{ request: { json: () => any; }; }} */ event
) => {
  const body = await event.request.json();

  const { success, data: bodyData, error: zodError } = await validator.safeParseAsync(body);

  if (!success) {
    return new Response(JSON.stringify(zodError), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const response = {
    language: 'c',
    version: '10.2.0',
    files: [
      {
        content: bodyData.code
      }
    ]
  };

  const res = await fetch(`${PISTON_BASE_URL}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response)
  });

  const print: PistonExecuteResponse = await res.json() as PistonExecuteResponse;
  const test_failed: string[] = [];
  const test_passed: string[] = [];

  // parse the output of the run
  if (print.compile?.code === 0) {
    const console_output = print.run.output.split('\n');

    // check if the output contains any test cases
    console_output.forEach((line: string) => {
      if (line.startsWith('TEST_PASSED:')) {
        test_passed.push(line.substring('TEST_PASSED:'.length));
      } else if (line.startsWith('TEST_FAILED:')) {
        test_failed.push(line.substring('TEST_FAILED:'.length));
      }
    });

    // remove the test cases from the output
    print.run.output = print.run.output
      .split('\n')
      .filter((line: string) => !line.startsWith('TEST_PASSED') && !line.startsWith('TEST_FAILED'))
      .join('\n');
  }

  (print.run as any).test_failed = test_failed;
  (print.run as any).test_passed = test_passed;

  return new Response(JSON.stringify(print), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
