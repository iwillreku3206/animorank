import type { CType, CTypeWithValue } from '../../../zenstack/models';

/**
 * Converts a C type object to a C code string
 */
export const typeToString = (type: CType | CTypeWithValue): string => {
	let output = '';
	if (!type) return output;
	if (type.base == 'INT' || type.base == 'CHAR') {
		if (type.signed === true) {
			output += 'signed ';
		} else if (type.signed === false) {
			output += 'unsigned ';
		}
	}

	if (type.base == 'INT') {
		if (type.sizeModifier) output += `${type.sizeModifier.replaceAll('_', ' ').toLowerCase()} `;
	}

	output += type.base.toLowerCase();

	if (type.isPointer) output += '*';

	return output;
};

export const typeToPrintf = (type: CType) => {
	switch (type.base) {
		case 'BOOL':
			return '%hhu';
		case 'FLOAT':
			return '%f';
		case 'DOUBLE':
			return '%lf';
		case 'CHAR':
			return '%c';
		case 'INT':
			let int_specifier = '%';
			switch (type.sizeModifier) {
				case 'SHORT':
					int_specifier += 'h';
					break;
				case 'LONG_LONG':
					int_specifier += 'l';
				case 'LONG':
					int_specifier += 'l';
					break;
			}

			switch (type.signed) {
				case true:
				case undefined:
					int_specifier += 'd';
					break;
				case false:
					int_specifier += 'u';
					break;
			}
			return int_specifier;
	}
};
