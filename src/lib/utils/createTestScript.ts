// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/**
 * @typedef {Object} TestCase
 * @property {Array<number|string>} inputs - The input values for the test case. These can be numbers or characters.
 * @property {Array<'int'|'float'|'char'>} inputTypes - The types of the input values (e.g., 'int', 'float', 'char').
 * @property {Array<number|string>} output - The expected output of the function for the given inputs.
 * @property {string} outputType - The type of the output (e.g., 'int', 'float', 'char').
 * @property {string} operator - The operator used to validate the output (e.g., '==').
 */

/**
 * Formats a single input parameter
 * @param {*} input
 * @param {*} index
 * @param {*} inputTypes
 * @returns
 */
const formatInput = (input, index, inputTypes) => {
  if (Array.isArray(input)) {
    if (inputTypes[index] == 'char[]') {
      input = input.map((x) => `'${x}'`);
    }
    input = `(${inputTypes[index]}){${input.join(',')}}`;
  } else if (inputTypes[index] == 'char') {
    input = `'${input}'`;
  }
  return input;
};

/**
 * C segment that runs a single testCase and prints `GOOD`
 * if satisfied, then prints the output if not satisfied...
 * @param {string} fName - name of the testCase
 * @param {TestCase} testCase - testCases
 */
const runTc = (fName, testCase, inputTypes, dtype) => {
  const inputs = testCase.inputs.map((x, i) => formatInput(x, i, inputTypes)).join(',');

  const formatSpecifier = {
    int: '%d',
    float: '%.5f',
    char: '%c'
  };

  const template = `
            res = ${fName}(${inputs});
            if (res ${testCase.operator} ${formatInput(testCase.output, 0, [dtype])}){
                printf("\\nTEST_PASSED: ${formatSpecifier[dtype]} ${testCase.operator} ${testCase.output} ✅\\n", res);            
            } else {
                printf("\\nTEST_FAILED: ${formatSpecifier[dtype]} ${testCase.operator} ${testCase.output} ❌\\n", res);
            }
    `;

  return template;
};

/**
 * templates a test script (main function) that tests a function with given test cases
 * @param {string} dtype
 * @param {string} fName
 * @param {string[]} inputTypes,
 * @param {TestCase[]} testCases
 */
export const createTestScript = (dtype, fName, inputTypes, testCases) => {
  const inTypesTemplate = inputTypes.join(',');
  const tcTemplates = testCases.map((x) => runTc(fName, x, inputTypes, dtype)).join('');

  const template = `
        #include<stdio.h>

        ${dtype} ${fName}(${inTypesTemplate});

        int main(){

            ${dtype} res;
            ${tcTemplates}

            return 0;
        }

        // Student code will be appended here

    `;

  return template;
};

/**
 * Generates skeleton code for the given function
 * @param {*} dtype - return datatype
 * @param {*} fName - name of function to be tested
 * @param {*} inputTypes - array of datatypes of inputs
 */
export const generateStarterCode = (dtype, fName, inputTypes) => {
  const parameters = inputTypes
    .map((x, i) => {
      if (inputTypes[i].endsWith('[]')) {
        return `${inputTypes[i].slice(0, -2)} ${String.fromCharCode(97 + i)}[]`;
      } else {
        return `${inputTypes[i]} ${String.fromCharCode(97 + i)}`;
      }
    })
    .join(', ');

  return `
${dtype} ${fName}(${parameters}){
    //TODO: implement the ${fName} function.
}
    
    `;
};
