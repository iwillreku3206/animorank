import type { PreviousCode, PreviousCodeSection } from '$lib/practiceSession/index.svelte';

export function parseSlots(template: string, slotCode?: Record<string, string>): PreviousCode {
  const lines = template.replaceAll('\r\n', '\n').split('\n');
  const finalLines: string[] = [];
  const sections: PreviousCodeSection[] = [];

  let currentSlotLabel: string | null = null;
  let currentSlotContent: string[] = [];
  let slotStartLine = -1;

  // Regex to match "%slot label%" and "%endslot label%" with optional whitespace
  const slotRegex = /^\s*%slot\s+(.+?)%\s*$/;
  const endSlotRegex = /^\s*%endslot\s+(.+?)%\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for start of a slot
    const slotMatch = line.match(slotRegex);
    if (slotMatch) {
      currentSlotLabel = slotMatch[1];
      currentSlotContent = [];
      // Line indices are 1-indexed, so the next inserted line will be `finalLines.length + 1`
      slotStartLine = finalLines.length + 1;
      continue; // Skip adding the %slot% marker line
    }

    // Check for end of a slot
    const endSlotMatch = line.match(endSlotRegex);
    if (endSlotMatch && currentSlotLabel === endSlotMatch[1]) {
      let finalContent = currentSlotContent;

      // Replace with saved code if provided
      if (slotCode && slotCode[currentSlotLabel] !== undefined) {
        finalContent = slotCode[currentSlotLabel].replaceAll('\r\n', '\n').split('\n');
      }

      // Add the final evaluated content into the code payload
      finalLines.push(...finalContent);

      // Calculate the 1-indexed range
      const startLine = slotStartLine;
      const endLine = finalContent.length > 0 ? finalLines.length : slotStartLine;
      const startCol = 1;
      const endCol = finalContent.length > 0 ? finalContent[finalContent.length - 1].length + 1 : 1;

      sections.push({
        slot: {
          label: currentSlotLabel,
          initialRange: [startLine, startCol, endLine, endCol]
        },
        code: finalContent.join('\n')
      });

      // Reset state tracker
      currentSlotLabel = null;
      continue; // Skip adding the %endslot% marker line
    }

    // Collect lines
    if (currentSlotLabel !== null) {
      currentSlotContent.push(line); // We are inside a slot
    } else {
      finalLines.push(line); // We are outside of any slots
    }
  }

  return {
    fullCode: finalLines.join('\n'),
    sections
  };
}
