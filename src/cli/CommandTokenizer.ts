/** Parses one CLI line. Only a leading # starts a comment; colors stay intact. */
export class CommandTokenizer {
  public tokenize(line: string): readonly string[] {
    if (line.trimStart().startsWith('#')) {
      return [];
    }

    const tokens: string[] = [];
    let token = '';
    let started = false;
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line.charAt(index);

      if (quoted && character === '\\') {
        const next = line.charAt(index + 1);
        if (next === '"' || next === '\\') {
          token += next;
          index += 1;
          continue;
        }
      }

      if (character === '"') {
        quoted = !quoted;
        started = true;
      } else if (!quoted && /\s/u.test(character)) {
        if (started) {
          tokens.push(token);
          token = '';
          started = false;
        }
      } else {
        token += character;
        started = true;
      }
    }

    if (quoted) {
      throw new Error('unterminated double quote');
    }
    if (started) {
      tokens.push(token);
    }
    return tokens;
  }
}
